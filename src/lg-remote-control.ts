import { HomeAssistant } from "custom-card-helpers";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import "./editor";
import { CARD_TAG_NAME, CARD_VERSION, EDITOR_CARD_TAG_NAME } from "./const";
import { HoldRepeatController } from "./hold-repeat-controller";
import {
  lineOutIcon,
  amazonIcon,
  tvOpticIcon,
  daznIcon,
  disneyIcon,
  tvHeadphonesIcon,
  arcIcon,
  opticIcon,
  nowTvIcon,
} from "./icons";
import { HomeAssistantFixed, WindowWithCards } from "./types";
import { getMediaPlayerEntitiesByPlatform } from "./utils";

const line1 = "  LG WebOS Remote Control Card  ";
const line2 = `  version: ${CARD_VERSION}  `;
/* eslint no-console: 0 */
console.info(
  `%c${line1}\n%c${line2}`,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray",
);

// Allow this card to appear in the card chooser menu
const windowWithCards = window as unknown as WindowWithCards;
windowWithCards.customCards = windowWithCards.customCards || [];
windowWithCards.customCards.push({
  type: CARD_TAG_NAME,
  name: "LG WebOS Remote Control Card",
  preview: true,
  description: "Remote control card for LG WebOS TV devices",
});

@customElement(CARD_TAG_NAME)
class LgRemoteControl extends LitElement {
  public hass!: HomeAssistant;
  public config!: any;
  private _show_inputs: boolean;
  private _show_sound_output: boolean;
  private _show_text: boolean;
  private _show_keypad: boolean;
  private _show_vol_text: boolean;
  private volume_value: number;
  private soundOutput: string;
  private output_entity: string;
  private valueDisplayTimeout: ReturnType<typeof setTimeout> | undefined;
  private homeisLongPress: boolean = false;
  private homelongPressTimer: ReturnType<typeof setTimeout> | undefined;
  private _directionCtrl!: HoldRepeatController;
  private _volumeCtrl!: HoldRepeatController;

  static getConfigElement() {
    // Create and return an editor element
    return document.createElement(EDITOR_CARD_TAG_NAME);
  }

  public static getStubConfig(hass: HomeAssistantFixed) {
    let entities = getMediaPlayerEntitiesByPlatform(hass, "webostv");
    if (entities.length === 0) {
      entities = Object.keys(hass.entities).filter((e) => e.startsWith("media_player."));
    }
    const entity = entities.length > 0 ? entities[0] : "media_player.lg_webos_smart_tv";
    return {
      type: `custom:${CARD_TAG_NAME}`,
      entity: entity,
    };
  }

  static get iconMapping() {
    return {
      disney: disneyIcon(),
      dazn: daznIcon(),
      nowtv: nowTvIcon(),
      amazon: amazonIcon(),
    };
  }

  static get properties() {
    return {
      hass: {},
      config: {},
      _show_inputs: {},
      _show_sound_output: {},
      _show_text: {},
      _show_keypad: {},
      _show_vol_text: {},
      volume_value: { type: Number, reflect: true },
      output_entity: { type: String, reflect: true },
    };
  }

  protected shouldUpdate(changed: Map<string, unknown>): boolean {
    // internal state must always re-render
    if (
      changed.has("_show_inputs") ||
      changed.has("_show_sound_output") ||
      changed.has("_show_text") ||
      changed.has("_show_keypad") ||
      changed.has("_show_vol_text") ||
      changed.has("volume_value") ||
      changed.has("soundOutput") ||
      changed.has("output_entity") ||
      changed.has("config")
    )
      return true;
    if (!changed.has("hass")) return super.shouldUpdate(changed);
    const oldHass: any = changed.get("hass");
    if (!oldHass) return true;
    const keys = [this.config?.entity, this.config?.ampli_entity].filter(Boolean);
    for (const k of keys) if (oldHass.states?.[k] !== this.hass.states?.[k]) return true;
    return false;
  }

  constructor() {
    super();
    this._show_inputs = false;
    this._show_sound_output = false;
    this._show_text = false;
    this._show_keypad = false;
    this._show_vol_text = false;
    this.volume_value = 0;
    this.soundOutput = "";
    this._directionCtrl = new HoldRepeatController(
      () => this._repeatDelay,
      () => this._repeatInterval,
      (k) => this._button(k),
      (...a) => this._debugLog(...a),
    );
    this._volumeCtrl = new HoldRepeatController(
      () => this._volumeDelay,
      () => this._volumeInterval,
      (k) => this._updateVolume(k),
      (...a) => this._debugLog(...a),
    );
  }

  render() {
    if (!this.hass || !this.config?.entity) return html``;
    const stateObj = this.hass.states[this.config.entity];
    if (!stateObj) {
      return html`<ha-card style="padding:16px;color:var(--error-color)"
        >Entity not found: ${this.config.entity}</ha-card
      >`;
    }
    const {
      borderWidth,
      remoteWidth,
      backgroundColor,
      borderColor,
      buttonColor,
      textColor,
      tvNameColor,
      mac,
    } = this._derivedStyles;

    return html`
      <div class="card">
        <div
          class="page"
          style="box-sizing: border-box; --remote-button-color: ${buttonColor}; --remote-text-color: ${textColor}; --remote-color: ${backgroundColor}; --remotewidth: ${remoteWidth};  --main-border-color: ${borderColor}; --main-border-width: ${borderWidth}"
        >
          ${this._renderTitle(tvNameColor)} ${this._renderPower(stateObj, mac, textColor, remoteWidth)}
          ${this._renderCenter(stateObj, backgroundColor)}
                        <!-- ################################# SOURCE BUTTONS ################################# -->
                        ${
                          this.config.sources
                            ? html`
                                <div class="grid-container-source">
                                  ${this.config.sources.map((source) => {
                                    return html`
                                      <button
                                        class="btn_source ripple"
                                        @click=${() => this._select_source(source.name)}
                                      >
                                        ${LgRemoteControl.getIcon(source.icon)}
                                      </button>
                                    `;
                                  })}
                                </div>
                              `
                            : html` <div class="grid-container-source">
                                <button
                                  class="btn_source ripple"
                                  @click=${() => this._select_source("Netflix")}
                                >
                                  <ha-icon style="heigth: 70%; width: 70%;" icon="mdi:netflix" />
                                </button>
                                <button
                                  class="btn_source ripple"
                                  @click=${() => this._select_source("Prime Video")}
                                >
                                  ${amazonIcon()}
                                </button>
                                <button
                                  class="btn_source ripple"
                                  @click=${() => this._select_source("Disney+")}
                                >
                                  ${disneyIcon()}
                                </button>
                                <button
                                  class="btn_source ripple"
                                  @click=${() => this._select_source("DAZN")}
                                >
                                  ${daznIcon()}
                                </button>
                              </div>`
                        }
                        <!-- ################################# SOURCE BUTTONS END ################################# -->

                        <!-- ################################# COLORED BUTTONS ################################# -->
                        ${
                          this.config.color_buttons
                            ? html`
                                <div class="grid-container-color_btn">
                                  <button
                                    class="btn-color ripple"
                                    style="background-color: red; height: calc(var(--remotewidth) / 12);"
                                    @click=${() => this._button("RED")}
                                  ></button>
                                  <button
                                    class="btn-color ripple"
                                    style="background-color: green; height: calc(var(--remotewidth) / 12);"
                                    @click=${() => this._button("GREEN")}
                                  ></button>
                                  <button
                                    class="btn-color ripple"
                                    style="background-color: yellow; height: calc(var(--remotewidth) / 12);"
                                    @click=${() => this._button("YELLOW")}
                                  ></button>
                                  <button
                                    class="btn-color ripple"
                                    style="background-color: blue; height: calc(var(--remotewidth) / 12);"
                                    @click=${() => this._button("BLUE")}
                                  ></button>
                                </div>
                              `
                            : html``
                        }
                        <!-- ################################# COLORED BUTTONS END ################################# -->

                        <div class="grid-container-volume-channel-control" >
                            <button class="btn ripple" id="plusButton" style="border-radius: 50% 50% 0px 0px; margin: 0px auto 0px auto; height: 100%; touch-action: none;"
                                @pointerdown=${(e: PointerEvent) => this._onVolumePointerDown("volume_up", e)}
                                @pointerup=${(e: PointerEvent) => this._onVolumePointerUp(e)}
                                @pointercancel=${(e: PointerEvent) => this._onVolumePointerCancel(e)}
                                @pointerleave=${(e: PointerEvent) => this._onVolumePointerCancel(e)}
                                @click=${(e: Event) => this._onVolumeClick("volume_up", e)}
                            ><ha-icon icon="mdi:plus"/></button>
                            <button class="btn-flat flat-high ripple" id="homeButton" style="margin-top: 0px; height: 50%; touch-action: none;" @pointerdown=${(e: PointerEvent) => this._homePointerDown(e)} @pointerup=${(e: PointerEvent) => this._homePointerUp(e)} @pointercancel=${(e: PointerEvent) => this._homePointerCancel(e)} @pointerleave=${(e: PointerEvent) => this._homePointerCancel(e)}>
    <ha-icon icon="mdi:home"></ha-icon>
</button>








                            <button class="btn ripple" style="border-radius: 50% 50% 0px 0px; margin: 0px auto 0px auto; height: 100%;" @click=${() => this._button("CHANNELUP")}><ha-icon icon="mdi:chevron-up"/></button>
                            <button class="btn" style="border-radius: 0px; cursor: default; margin: 0px auto 0px auto; height: 100%;"><ha-icon icon="${stateObj.attributes.is_volume_muted === true ? "mdi:volume-off" : "mdi:volume-high"}"/></button>
                            <button class="btn ripple" Style="color:${stateObj.attributes.is_volume_muted === true ? "red" : ""}; height: 100%;" @click=${() => this._button("MUTE")}><span class="${stateObj.attributes.is_volume_muted === true ? "blink" : ""}"><ha-icon icon="mdi:volume-mute"></span></button>
                            <button class="btn" style="border-radius: 0px; cursor: default; margin: 0px auto 0px auto; height: 100%;"><ha-icon icon="mdi:parking"/></button>
                            <button class="btn ripple" id="minusButton" style="border-radius: 0px 0px 50% 50%; margin: 0px auto 0px auto; height: 100%; touch-action: none;"
                                @pointerdown=${(e: PointerEvent) => this._onVolumePointerDown("volume_down", e)}
                                @pointerup=${(e: PointerEvent) => this._onVolumePointerUp(e)}
                                @pointercancel=${(e: PointerEvent) => this._onVolumePointerCancel(e)}
                                @pointerleave=${(e: PointerEvent) => this._onVolumePointerCancel(e)}
                                @click=${(e: Event) => this._onVolumeClick("volume_down", e)}
                            ><ha-icon icon="mdi:minus"/></button>
                            <button class="btn-flat flat-high ripple" style="margin-bottom: 0px; height: 50%;" @click=${() => this._button("INFO")}><ha-icon icon="mdi:information-variant"/></button>
                            <button class="btn ripple" style="border-radius: 0px 0px 50% 50%;  margin: 0px auto 0px auto; height: 100%;"  @click=${() => this._button("CHANNELDOWN")}><ha-icon icon="mdi:chevron-down"/></button>
                        </div>

                        <!-- ################################# MEDIA CONTROL ################################# -->
                        <div class="grid-container-media-control" >
                            <button class="btn-flat flat-low ripple"  @click=${() => this._command("PLAY", "media.controls/play")}><ha-icon icon="mdi:play"/></button>
                            <button class="btn-flat flat-low ripple"  @click=${() => this._command("PAUSE", "media.controls/pause")}><ha-icon icon="mdi:pause"/></button>
                            <button class="btn-flat flat-low ripple"  @click=${() => this._command("STOP", "media.controls/stop")}><ha-icon icon="mdi:stop"/></button>
                            <button class="btn-flat flat-low ripple"  @click=${() => this._command("REWIND", "media.controls/rewind")}><ha-icon icon="mdi:skip-backward"/></button>
                            <button class="btn-flat flat-low ripple" style="color: red;" @click=${() => this._command("RECORD", "media.controls/Record")}><ha-icon icon="mdi:record"/></button>
                            <button class="btn-flat flat-low ripple"  @click=${() => this._command("FAST_FOWARD", "media.controls/fastForward")}><ha-icon icon="mdi:skip-forward"/></button>
                        </div>
                        <!-- ################################# MEDIA CONTROL END ################################# -->
                        </div>
        </div>
      </div>
    `;
  }

  private get _derivedStyles() {
    const scale = Math.max(0.5, Math.min(2, Number(this.config?.dimensions?.scale ?? 1) || 1));
    return {
      borderWidth: this.config?.dimensions?.border_width ?? "1px",
      remoteWidth: Math.round(scale * 260) + "px",
      tvNameColor: this.config?.tv_name_color ?? "var(--primary-text-color)",
      backgroundColor:
        this.config?.colors?.background ??
        "var( --ha-card-background, var(--card-background-color, white) )",
      borderColor: this.config?.colors?.border ?? "var(--primary-text-color)",
      buttonColor: this.config?.colors?.buttons ?? "var(--secondary-background-color)",
      textColor: this.config?.colors?.text ?? "var(--primary-text-color)",
      mac: this.config?.mac,
    };
  }
  private _renderTitle(color: string) {
    return this.config?.name
      ? html`<div class="tv_title" style="color:${color}">${this.config.name}</div>`
      : "";
  }
  private _renderPower(stateObj: any, mac: string, textColor: string, remoteWidth: string) {
    return html`<div class="grid-container-power" style="--remotewidth: ${remoteWidth}">
      <button type="button" class="btn-flat flat-high ripple" @click=${() => this._channelList()}>
        <ha-icon icon="mdi:format-list-numbered" />
      </button>
      ${
        ["off", "unavailable"].includes(stateObj.state)
          ? html`<button
              type="button"
              class="btn ripple"
              @click=${() => this._media_player_turn_on(mac)}
            >
              <ha-icon icon="mdi:power" style="color: ${textColor};" />
            </button>`
          : html`<button
              type="button"
              class="btn ripple"
              @click=${() => this._media_player_service("POWER", "turn_off")}
            >
              <ha-icon icon="mdi:power" style="color: red;" />
            </button>`
      }
      <button
        type="button"
        class="btn-flat flat-high ripple"
        @click=${() => (this._show_keypad = !this._show_keypad)}
      >
        123
      </button>
    </div>`;
  }
  private _renderCenter(stateObj: any, backgroundColor: string) {
    if (this._show_inputs) return this._renderInputs(stateObj);
    if (this._show_sound_output) return this._renderSound(stateObj);
    if (this._show_keypad) return this._renderKeypad();
    return this._renderDpad(backgroundColor);
  }
  private _renderInputs(stateObj: any) {
    return html`<div class="grid-container-input">
      <div class="shape-input">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 130">
          <path
            d="m 187 43 a 30 30 0 0 0 60 0 a 30 30 0 0 0 -60 0 M 148 12 a 30 30 0 0 1 30 30 a 40 40 0 0 0 40 40 a 30 30 0 0 1 30 30 v 18 h -236 v -88 a 30 30 0 0 1 30 -30"
            fill="var(--remote-button-color)"
            stroke="#000000"
            stroke-width="0"
          />
        </svg>
      </div>
      <button
        type="button"
        class="ripple bnt-input-back"
        @click=${() => (this._show_inputs = false)}
      >
        <ha-icon icon="mdi:undo-variant" />
      </button>
      <p class="source_text"><b>SOURCE</b></p>
      <div class="grid-item-input">
        ${(stateObj.attributes.source_list ?? []).map(
          (source) =>
            html`<button
              type="button"
              class="${stateObj.attributes.source === source ? "btn-input-on" : "btn-input ripple overlay"}"
              @click=${() => {
                this._select_source(source);
                this._show_inputs = false;
              }}
            >
              ${source}
            </button>`,
        )}
      </div>
    </div>`;
  }
  private _renderSound(stateObj: any) {
    const so = stateObj.attributes.sound_output;
    const btn = (val: string, cls: string, label: string, icon?: any) =>
      html`<button
        type="button"
        class="${so === val ? "btn_sound_on " + cls : "btn_sound_off " + cls + " ripple overlay"}"
        @click=${() => this._select_sound_output(val)}
      >
        ${icon ?? label}
      </button>`;
    // keep original dual layout (text vs icon) - delegate to existing template for brevity
    if (this._show_text) {
      return html`<div class="grid-container-sound">
        <div class="shape-sound">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260">
            <path
              d="m 13 43 a 30 30 0 0 0 60 0 a 30 30 0 0 0 -60 0 M 130 12 h 88 a 30 30 0 0 1 30 30 v 188 a 30 30 0 0 1 -30 30 h -176 a 30 30 0 0 1 -30 -30 v -117 a 30 30 0 0 1 30 -30 a 40 40 0 0 0 41 -41 a 30 30 0 0 1 30 -30 z "
              fill="var(--remote-button-color)"
              stroke="#000000"
              stroke-width="0"
            />
          </svg>
        </div>
        <button
          type="button"
          class="bnt-sound-back ripple"
          @click=${() => (this._show_sound_output = false)}
        >
          <ha-icon icon="mdi:undo-variant" /></button
        ><button
          type="button"
          class="btn_soundoutput ripple"
          @click=${() => (this._show_text = false)}
        >
          SOUND</button
        >${btn("tv_speaker", "tv bnt_sound_text_width", "TV Speaker")}${btn("tv_external_speaker", "tv-opt bnt_sound_text_width", "TV + Optic")}${btn("tv_speaker_headphone", "tv-phone bnt_sound_text_width", "TV + H-Phone")}${btn("external_optical", "opt bnt_sound_text_width", "Optical")}${btn("external_arc", "hdmi bnt_sound_text_width", "HDMI")}${btn("lineout", "line bnt_sound_text_width", "Lineout")}${btn("headphone", "phone bnt_sound_text_width", "HeadPhone")}${btn("bt_soundbar", "bluetooth bnt_sound_text_width", "Bluetooth")}
      </div>`;
    }
    return html`<div class="grid-container-sound"><div class="shape-sound"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260"><path d="m 13 43 a 30 30 0 0 0 60 0 a 30 30 0 0 0 -60 0 M 130 12 h 88 a 30 30 0 0 1 30 30 v 188 a 30 30 0 0 1 -30 30 h -176 a 30 30 0 0 1 -30 -30 v -117 a 30 30 0 0 1 30 -30 a 40 40 0 0 0 41 -41 a 30 30 0 0 1 30 -30 z " fill="var(--remote-button-color)" stroke="#000000" stroke-width="0"/></svg></div><button type="button" class="bnt-sound-back ripple" @click=${() => (this._show_sound_output = false)}><ha-icon icon="mdi:undo-variant" /></button><button type="button" class="sound_icon_text ripple" @click=${() => (this._show_text = true)}><ha-icon icon="mdi:speaker"></button><button type="button" class="${so === "tv_speaker" ? "btn_sound_on tv bnt_sound_icon_width" : "btn_sound_off tv bnt_sound_icon_width ripple overlay"}" @click=${() => this._select_sound_output("tv_speaker")}><ha-icon class="icon_source" icon="mdi:television-classic"></button><button type="button" class="${so === "tv_external_speaker" ? "btn_sound_on tv-opt bnt_sound_icon_width" : "btn_sound_off tv-opt bnt_sound_icon_width ripple overlay"}" @click=${() => this._select_sound_output("tv_external_speaker")}>${tvOpticIcon()}</button><button type="button" class="${so === "tv_speaker_headphone" ? "btn_sound_on tv-phone bnt_sound_icon_width" : "btn_sound_off tv-phone bnt_sound_icon_width ripple overlay"}" @click=${() => this._select_sound_output("tv_speaker_headphone")}>${tvHeadphonesIcon()}</button><button type="button" class="${so === "external_optical" ? "btn_sound_on opt bnt_sound_icon_width" : "btn_sound_off opt bnt_sound_icon_width ripple overlay"}" @click=${() => this._select_sound_output("external_optical")}>${opticIcon()}</button><button type="button" class="${so === "external_arc" ? "btn_sound_on hdmi bnt_sound_icon_width" : "btn_sound_off hdmi bnt_sound_icon_width ripple overlay"}" @click=${() => this._select_sound_output("external_arc")}>${arcIcon()}</button><button type="button" class="${so === "lineout" ? "btn_sound_on line bnt_sound_icon_width" : "btn_sound_off line bnt_sound_icon_width ripple overlay"}" @click=${() => this._select_sound_output("lineout")}>${lineOutIcon()}</button><button type="button" class="${so === "headphone" ? "btn_sound_on phone bnt_sound_icon_width" : "btn_sound_off phone bnt_sound_icon_width ripple overlay"}" @click=${() => this._select_sound_output("headphone")}><ha-icon class="icon_source" icon="mdi:headphones"></button><button type="button" class="${so === "bt_soundbar" ? "btn_sound_on bluetooth bnt_sound_icon_width" : "btn_sound_off bluetooth bnt_sound_icon_width ripple overlay"}" @click=${() => this._select_sound_output("bt_soundbar")}><ha-icon class="icon_source" icon="mdi:bluetooth"></button></div>`;
  }
  private _renderKeypad() {
    return html`<div class="grid-container-keypad">
      ${["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => html`<button type="button" class="btn-keypad ripple" @click=${() => this._button(n)}>${n}</button>`)}<button
        type="button"
        class="btn-keypad"
      ></button
      ><button type="button" class="btn-keypad ripple" @click=${() => this._button("0")}>0</button
      ><button type="button" class="btn-keypad"></button>
    </div>`;
  }
  private _renderDpad(backgroundColor: string) {
    return html`<div class="grid-container-cursor">
      <div class="shape">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 79">
          <path
            d="m 30 15 a 10 10 0 0 1 20 0 a 15 15 0 0 0 15 15 a 10 10 0 0 1 0 20 a 15 15 0 0 0 -15 15 a 10 10 0 0 1 -20 0 a 15 15 0 0 0 -15 -15 a 10 10 0 0 1 0 -20 a 15 15 0 0 0 15 -15"
            fill="var(--remote-button-color)"
            stroke="#000000"
            stroke-width="0"
          />
        </svg>
      </div>
      <button
        type="button"
        class="btn ripple item_sound"
        @click=${() => (this._show_sound_output = true)}
      >
        <ha-icon icon="mdi:speaker" />
      </button>
      <button
        type="button"
        class="btn ripple item_up"
        style="background-color: transparent; touch-action: none;"
        @pointerdown=${(e: PointerEvent) => this._onDirectionPointerDown("UP", e)}
        @pointerup=${(e: PointerEvent) => this._onDirectionPointerUp(e)}
        @pointercancel=${(e: PointerEvent) => this._onDirectionPointerCancel(e)}
        @pointerleave=${(e: PointerEvent) => this._onDirectionPointerCancel(e)}
        @click=${(e: Event) => this._onDirectionClick("UP", e)}
      >
        <ha-icon icon="mdi:chevron-up" />
      </button>
      <button
        type="button"
        class="btn ripple item_input"
        @click=${() => (this._show_inputs = true)}
      >
        <ha-icon icon="mdi:import" />
      </button>
      <button
        type="button"
        class="btn ripple item_2_sx"
        style="background-color: transparent; touch-action: none;"
        @pointerdown=${(e: PointerEvent) => this._onDirectionPointerDown("LEFT", e)}
        @pointerup=${(e: PointerEvent) => this._onDirectionPointerUp(e)}
        @pointercancel=${(e: PointerEvent) => this._onDirectionPointerCancel(e)}
        @pointerleave=${(e: PointerEvent) => this._onDirectionPointerCancel(e)}
        @click=${(e: Event) => this._onDirectionClick("LEFT", e)}
      >
        <ha-icon icon="mdi:chevron-left" />
      </button>
      <button
        type="button"
        class="ok_button ripple item_2_c"
        style="border: solid 2px ${backgroundColor}"
        @click=${() => this._button("ENTER")}
      >
        ${this._show_vol_text ? this.volume_value : "OK"}
      </button>
      <button
        type="button"
        class="btn ripple item_right"
        style="background-color: transparent; touch-action: none;"
        @pointerdown=${(e: PointerEvent) => this._onDirectionPointerDown("RIGHT", e)}
        @pointerup=${(e: PointerEvent) => this._onDirectionPointerUp(e)}
        @pointercancel=${(e: PointerEvent) => this._onDirectionPointerCancel(e)}
        @pointerleave=${(e: PointerEvent) => this._onDirectionPointerCancel(e)}
        @click=${(e: Event) => this._onDirectionClick("RIGHT", e)}
      >
        <ha-icon icon="mdi:chevron-right" />
      </button>
      <button type="button" class="btn ripple item_back" @click=${() => this._button("BACK")}>
        <ha-icon icon="mdi:undo-variant" />
      </button>
      <button
        type="button"
        class="btn ripple item_down"
        style="background-color: transparent; touch-action: none;"
        @pointerdown=${(e: PointerEvent) => this._onDirectionPointerDown("DOWN", e)}
        @pointerup=${(e: PointerEvent) => this._onDirectionPointerUp(e)}
        @pointercancel=${(e: PointerEvent) => this._onDirectionPointerCancel(e)}
        @pointerleave=${(e: PointerEvent) => this._onDirectionPointerCancel(e)}
        @click=${(e: Event) => this._onDirectionClick("DOWN", e)}
      >
        <ha-icon icon="mdi:chevron-down" />
      </button>
      <button type="button" class="btn ripple item_exit" @click=${() => this._button("EXIT")}>
        EXIT
      </button>
    </div>`;
  }

  _channelList() {
    const popupEvent = new Event("ll-custom", { bubbles: true, cancelable: false, composed: true });
    (popupEvent as any).detail = {
      browser_mod: {
        service: "browser_mod.popup",
        data: {
          content: {
            type: "custom:card-channel-pad",
            entity: this.config.entity,
            channels: this.config.channels,
          },
          title: " ",
          size: "wide",
          style: "--popup-border-radius: 15px;",
        },
      },
    };
    this.ownerDocument.querySelector("home-assistant")?.dispatchEvent(popupEvent);
  }

  _button(button) {
    this.callServiceFromConfig(button, "webostv.button", {
      entity_id: this.config.entity,
      button: button,
    });
  }

  _command(button, command) {
    this.callServiceFromConfig(button, "webostv.command", {
      entity_id: this.config.entity,
      command: command,
    });
  }

  _media_player_turn_on(mac) {
    if (this.config.mac) {
      this.hass.callService("wake_on_lan", "send_magic_packet", {
        mac: mac,
      });
    } else {
      this._media_player_service("POWER", "turn_on");
    }
  }

  _media_player_service(button, service) {
    this.callServiceFromConfig(button, `media_player.${service}`, {
      entity_id: this.config.entity,
    });
  }

  firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    // volume hold now handled via pointer events in template (_onVolumePointerDown etc.)
    // kept for future init if needed; no legacy mousedown/touch listeners (removed to avoid double-fire)
    this._debugLog(
      `firstUpdated volume hold: delay=${this._volumeDelay} interval=${this._volumeInterval}`,
    );
  }

  protected willUpdate(changedProps: Map<string, unknown>) {
    super.willUpdate(changedProps);
    if (changedProps.has("hass") || changedProps.has("config")) {
      const stateObj = this.hass?.states?.[this.config?.entity];
      if (stateObj) {
        const ampliState = this.config.ampli_entity
          ? this.hass.states[this.config.ampli_entity]
          : undefined;
        const soundOut = stateObj.attributes?.sound_output;
        if (
          this.config.ampli_entity &&
          ampliState &&
          (soundOut === "external_arc" || soundOut === "external_optical")
        ) {
          const lvl = ampliState.attributes?.volume_level;
          const nextVol = typeof lvl === "number" ? Math.round(lvl * 100) : this.volume_value;
          if (nextVol !== this.volume_value) this.volume_value = nextVol;
          if (this.output_entity !== this.config.ampli_entity)
            this.output_entity = this.config.ampli_entity;
        } else {
          const lvl = stateObj.attributes?.volume_level;
          const nextVol = typeof lvl === "number" ? Math.round(lvl * 100) : 0;
          if (nextVol !== this.volume_value) this.volume_value = nextVol;
          if (this.output_entity !== this.config.entity) this.output_entity = this.config.entity;
        }
        const newSoundOutput = stateObj.attributes?.sound_output ?? "";
        if (newSoundOutput !== this.soundOutput) this.soundOutput = newSoundOutput;
      }
    }
  }

  updated() {}

  private _homePointerDown(e: PointerEvent) {
    try {
      (e as any).preventDefault();
    } catch {}
    try {
      (e.currentTarget as HTMLElement).setPointerCapture((e as PointerEvent).pointerId);
    } catch {}
    this.homeisLongPress = false;
    clearTimeout(this.homelongPressTimer);
    this.homelongPressTimer = setTimeout(() => {
      this.homeisLongPress = true;
      this._button("MENU");
    }, 1000);
  }
  private _homePointerUp(e: PointerEvent) {
    try {
      (e as any).preventDefault();
    } catch {}
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture((e as PointerEvent).pointerId);
    } catch {}
    clearTimeout(this.homelongPressTimer);
    if (!this.homeisLongPress) this._button("HOME");
  }
  private _homePointerCancel(e: PointerEvent) {
    clearTimeout(this.homelongPressTimer);
    this.homeisLongPress = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture((e as PointerEvent).pointerId);
    } catch {}
  }
  _homeButtonDown(event: MouseEvent | TouchEvent) {
    this._homePointerDown(event as unknown as PointerEvent);
  }
  _homeButtonUp(event: MouseEvent | TouchEvent) {
    this._homePointerUp(event as unknown as PointerEvent);
  }

  private get _repeatDelay(): number {
    const v = this.config?.repeat?.delay ?? this.config?.hold_delay ?? 400;
    const n = Number(v);
    return isNaN(n) ? 400 : Math.max(100, Math.min(1000, n));
  }

  private get _repeatInterval(): number {
    const v = this.config?.repeat?.interval ?? this.config?.hold_interval ?? 150;
    const n = Number(v);
    return isNaN(n) ? 150 : Math.max(50, Math.min(500, n));
  }

  private get _debugEnabled(): boolean {
    return !!(
      this.config?.debug ||
      this.config?.repeat?.debug ||
      (typeof window !== "undefined" && window.location.search.includes("lg_debug"))
    );
  }

  private _debugLog(...args: any[]) {
    if (this._debugEnabled) {
      console.log(`[lg-remote:${this.config?.entity ?? "unknown"}]`, ...args);
    }
  }

  private get _volumeDelay(): number {
    const v =
      this.config?.repeat?.volume_delay ??
      this.config?.repeat?.delay ??
      this.config?.hold_delay ??
      400;
    const n = Number(v);
    return isNaN(n) ? 400 : Math.max(100, Math.min(1000, n));
  }

  private get _volumeInterval(): number {
    // if user configured generic repeat interval or volume-specific, use it (respects debug config)
    const configured =
      this.config?.repeat?.volume_interval ??
      this.config?.repeat?.interval ??
      this.config?.hold_interval;
    if (configured !== undefined && configured !== null && `${configured}` !== "") {
      const n = Number(configured);
      return isNaN(n) ? 150 : Math.max(50, Math.min(500, n));
    }
    // fallback to original ampli logic (250 for ampli, 150 for TV - slightly slower than old 100 to avoid flooding)
    const isAmpli =
      this.output_entity &&
      this.config?.ampli_entity &&
      this.output_entity === this.config.ampli_entity;
    return isAmpli ? 250 : 150;
  }

  private _onDirectionPointerDown(direction: string, e: PointerEvent) {
    this._directionCtrl.onPointerDown(direction, e);
  }
  private _onDirectionPointerUp(e: PointerEvent) {
    this._directionCtrl.onPointerUp(e);
  }
  private _onDirectionPointerCancel(e: PointerEvent) {
    this._directionCtrl.onPointerCancel(e);
  }
  private _onDirectionClick(direction: string, e: Event) {
    this._directionCtrl.onClick(direction, e);
  }

  private _updateVolume(service: string) {
    if (isNaN(this.volume_value as any)) {
      this._debugLog(`volume skip - volume_value NaN`);
      return;
    }
    this._debugLog(`volume fire ${service} entity=${this.output_entity} vol=${this.volume_value}`);
    this.callServiceFromConfig(service.toUpperCase(), `media_player.${service}`, {
      entity_id: this.output_entity,
    });
    this._show_vol_text = true;
    this.requestUpdate();
    clearTimeout(this.valueDisplayTimeout);
    this.valueDisplayTimeout = setTimeout(() => {
      this._show_vol_text = false;
      this.requestUpdate();
    }, 800);
  }

  private _onVolumePointerDown(service: string, e: PointerEvent) {
    if (!Number.isFinite(this.volume_value)) return;
    this._show_vol_text = true;
    this.requestUpdate();
    this._volumeCtrl.onPointerDown(service, e);
  }
  private _onVolumePointerUp(e: PointerEvent) {
    const wasRepeating = this._volumeCtrl.repeating;
    this._volumeCtrl.onPointerUp(e);
    if (wasRepeating) {
      clearTimeout(this.valueDisplayTimeout);
      this.valueDisplayTimeout = setTimeout(() => {
        this._show_vol_text = false;
        this.requestUpdate();
      }, 800);
    }
  }
  private _onVolumePointerCancel(e: PointerEvent) {
    this._volumeCtrl.onPointerCancel(e);
    clearTimeout(this.valueDisplayTimeout);
    this.valueDisplayTimeout = setTimeout(() => {
      this._show_vol_text = false;
      this.requestUpdate();
    }, 800);
  }
  private _onVolumeClick(service: string, e: Event) {
    if (!Number.isFinite(this.volume_value)) return;
    this._volumeCtrl.onClick(service, e);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._directionCtrl.destroy();
    this._volumeCtrl.destroy();
    clearTimeout(this.homelongPressTimer);
    clearTimeout(this.valueDisplayTimeout);
    this.homelongPressTimer = undefined;
    this.valueDisplayTimeout = undefined;
  }

  _select_source(source) {
    this.hass.callService("media_player", "select_source", {
      entity_id: this.config.entity,
      source: source,
    });
  }

  _select_sound_output(sound_output) {
    this.hass.callService("webostv", "select_sound_output", {
      entity_id: this.config.entity,
      sound_output: sound_output,
    });
    this._show_sound_output = false;
  }

  setConfig(config) {
    if (!config?.entity || typeof config.entity !== "string") {
      throw new Error("Invalid configuration: missing entity");
    }
    if (!config.entity.startsWith("media_player.")) {
      console.warn(`[lg-remote:${config.entity}] entity does not look like a media_player`);
    }
    this.config = {
      ...config,
      dimensions: { ...(config.dimensions ?? {}) },
      colors: { ...(config.colors ?? {}) },
      repeat: { ...(config.repeat ?? {}) },
      keys: { ...(config.keys ?? {}) },
    };
    if (this.config?.debug || this.config?.repeat?.debug) {
      console.log(
        `[lg-remote:${this.config.entity}] debug enabled`,
        this.config.repeat ?? this.config,
      );
    }
  }

  getCardSize() {
    return 15;
  }

  callServiceFromConfig(key: string, service: string, serviceData: Record<string, any>) {
    let serviceToUse = service;
    let serviceDataToUse = serviceData;
    if (this.config.keys && key in this.config.keys) {
      const keyConfig = this.config.keys[key];
      if (typeof keyConfig?.service === "string" && keyConfig.service.includes(".")) {
        serviceToUse = keyConfig["service"];
        serviceDataToUse = keyConfig["data"] ?? serviceData;
      } else {
        console.warn(
          `[lg-remote:${this.config?.entity}] invalid keys[${key}].service:`,
          keyConfig?.service,
        );
      }
    }
    if (this._debugEnabled) {
      console.log(
        `[lg-remote:${this.config?.entity}] callService key=${key} service=${serviceToUse}`,
        serviceDataToUse,
      );
    }
    const dot = serviceToUse.indexOf(".");
    if (dot === -1) {
      console.warn(`[lg-remote:${this.config?.entity}] invalid service string:`, serviceToUse);
      return;
    }
    const domain = serviceToUse.slice(0, dot);
    const svc = serviceToUse.slice(dot + 1);
    if (!domain || !svc) {
      console.warn(
        `[lg-remote:${this.config?.entity}] invalid service domain/service:`,
        serviceToUse,
      );
      return;
    }
    this.hass.callService(domain, svc, serviceDataToUse);
  }

  static getIcon(iconName) {
    return Object.keys(LgRemoteControl.iconMapping).includes(iconName)
      ? LgRemoteControl.iconMapping[iconName]
      : html`<ha-icon style="height: 70%; width: 70%;" icon="${iconName}" />`;
  }

  static get styles() {
    return css`
          @keyframes blinker {
            50% {
              opacity: 0;
            }
          }
          .tv_title {
            width: fit-content;
            text-align: center;
            display: block;
            margin: auto;
            padding: calc(var(--remotewidth)/52) calc(var(--remotewidth)/26);
            border-radius: calc(var(--remotewidth)/10);
            background-color: var(--remote-button-color);
          }
          button:focus {
            outline: 0;
          }
          .ripple {
            position: relative;
            overflow: hidden;
            transform: translate3d(0, 0, 0);
          }
          .ripple:after {
            content: "";
            display: block;
            position: absolute;
            border-radius: 50%;
            top: 0;
            left: 0;
            pointer-events: none;
            background-image: radial-gradient(circle, #7a7f87 2%, transparent 10.01%);
            background-repeat: no-repeat;
            background-position: 50%;
            transform: scale(10, 10);
            opacity: 0;
            transition: transform .5s, opacity 1s;
          }
          .ripple:active:after {
            transform: scale(0, 0);
            opacity: .3;
            transition: 0s;
          }
          .blink {
            animation: blinker 1.5s linear infinite;
            color: red;
          }
          .card, .ripple:after {
            width: 100%;
            height: 100%}
          .card {
            display: flex;
            justify-content: center;
          }
          .page {
            background-color: var(--remote-color);
            height: 100%;
            display: inline-block;
            flex-direction: row;
            border: var(--main-border-width) solid var(--main-border-color);
            border-radius: calc(var(--remotewidth)/7.5);
            padding: calc(var(--remotewidth)/37.5) calc(var(--remotewidth)/15.2) calc(var(--remotewidth)/11);
          }
          .grid-container-power {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 1fr;
            background-color: transparent;
            overflow: hidden;
            width: var(--remotewidth);
            height: calc(var(--remotewidth)/3);
          }
          .grid-container-cursor, .grid-container-keypad {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            overflow: hidden;
            height: var(--remotewidth);
          }
          .grid-container-cursor {
            grid-template-rows: 1fr 1fr 1fr;
            width: var(--remotewidth);
            grid-template-areas: "sound up input""left ok right""back down exit"}
          .grid-container-keypad {
            grid-template-rows: 1fr 1fr 1fr 1fr;
            background-color: transparent;
            background-color: var(--remote-button-color);
            border-radius: 35px;
            width: calc(var(--remotewidth) - 10%);
            margin: auto;
          }
          .grid-container-input, .grid-container-sound {
            display: grid;
            background-color: transparent;
            overflow: hidden;
            width: var(--remotewidth);
          }
          .grid-container-input {
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: calc(var(--remotewidth)/2) calc(var(--remotewidth)/.5115);
          }
          .grid-container-sound {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 28% 6% 16% 16% 16% 16% 6%;
            height: var(--remotewidth);
            grid-template-areas: "bnt title"". .""tv tv-opt""tv-phone opt""hdmi line""phone bluetooth"}
          .grid-container-color_btn, .grid-container-source {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            grid-template-rows: auto;
            background-color: transparent;
            width: calc(var(--remotewidth)/1.03);
            overflow: hidden;
            margin: auto;
          }
          .grid-container-color_btn {
            height: calc(var(--remotewidth)/10);
          }
          .grid-container-media-control, .grid-container-volume-channel-control {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 1fr 1fr 1fr;
            background-color: transparent;
            width: var(--remotewidth);
            height: calc(var(--remotewidth)/1.4);
            overflow: hidden;
            margin-top: calc(var(--remotewidth)/12);
          }
          .grid-container-media-control {
            grid-template-rows: 1fr 1fr;
            height: calc(var(--remotewidth)/2.85);
          }
          .grid-item-input {
            grid-column-start: 1;
            grid-column-end: 4;
            grid-row-start: 1;
            grid-row-end: 3;
            display: grid;
            grid-template-columns: auto;
            background-color: var(--remote-button-color);
            margin: auto;
            margin-top: calc(var(--remotewidth)/2.6);
            overflow: scroll;
            height: calc(var(--remotewidth)*2.01);
            width: calc(var(--remotewidth) - 9%);
            border-radius: calc(var(--remotewidth)/12);
          }
          .grid-item-input::-webkit-scrollbar {
            display: none;
            -ms-overflow-style: none;
          }
          .shape, .shape-input, .shape-sound, .source_text {
            grid-column-start: 1;
            grid-column-end: 4;
            grid-row-start: 1;
          }
          .shape {
            grid-row-end: 4;
            padding: 5px;
          }
          .shape-input, .shape-sound, .source_text {
            grid-row-end: 3;
          }
          .shape-sound, .source_text {
            grid-column-end: 5;
            grid-row-end: 6;
          }
          .source_text {
            grid-column-end: 3;
            grid-row-end: 2;
            text-align: center;
            margin-top: calc(var(--remotewidth)/6);
            font-size: calc(var(--remotewidth)/10);
            opacity: .3;
          }
          .btn_soundoutput, .sound_icon_text {
            width: 70%;
            height: 70%;
            border-width: 0;
            margin: auto auto 0 0;
            cursor: pointer;
            background-color: transparent;
            grid-area: title;
          }
          .sound_icon_text {
            color: var(--remote-text-color);
            font-size: calc(var(--remotewidth)/18.75);
            overflow: hidden;
          }
          .btn_soundoutput {
            font-size: calc(var(--remotewidth)/12.5);
            display: block;
            opacity: .4;
            color: var(--remote-text-color);
            font-weight: bold;
          }
          .tv {
            grid-area: tv;
          }
          .tv-opt {
            grid-area: tv-opt;
          }
          .tv-phone {
            grid-area: tv-phone;
          }
          .opt {
            grid-area: opt;
          }
          .hdmi {
            grid-area: hdmi;
          }
          .phone {
            grid-area: phone;
          }
          .line {
            grid-area: line;
          }
          .bluetooth {
            grid-area: bluetooth;
          }
          .item_sound {
            grid-area: sound;
          }
          .item_up {
            grid-area: up;
          }
          .item_input {
            grid-area: input;
          }
          .item_2_sx {
            grid-area: left;
          }
          .item_2_c {
            grid-area: ok;
          }
          .item_right {
            grid-area: right;
          }
          .item_back {
            grid-area: back;
          }
          .item_down {
            grid-area: down;
          }
          .item_exit {
            grid-area: exit;
          }
          ha-icon {
            width: calc(var(--remotewidth)/10.8);
            height: calc(var(--remotewidth)/10.8);
          }
          .bnt-input-back, .bnt-sound-back, .btn {
            font-size: calc(var(--remotewidth)/18.75);
            border-radius: 50%;
            place-items: center;
            display: inline-block;
            cursor: pointer;
          }
          .btn {
            background-color: var(--remote-button-color);
            color: var(--remote-text-color);
            width: 70%;
            height: 70%;
            border-width: 0;
            margin: auto;
          }
          .bnt-input-back, .bnt-sound-back {
            background-color: transparent;
            margin-top: calc(var(--remotewidth)/21);
          }
          .bnt-input-back {
            grid-column-start: 3;
            grid-column-end: 4;
            grid-row-start: 1;
            grid-row-end: 2;
            color: var(--remote-text-color);
            width: 70%;
            height: 50%;
            border-width: 0;
            margin-left: calc(var(--remotewidth)/21);
          }
          .bnt-sound-back {
            margin-left: 0;
            grid-area: bnt;
            width: 45%;
            height: 83%;
            margin-left: calc(var(--remotewidth)/18);
          }
          .bnt-sound-back, .btn-color, .btn-keypad, .btn_source {
            color: var(--remote-text-color);
            border-width: 0;
          }
          .btn-keypad {
            background-color: transparent;
            font-size: calc(var(--remotewidth)/10);
            width: 100%;
            height: 100%}
          .btn-color, .btn_source {
            background-color: var(--remote-button-color);
            border-radius: calc(var(--remotewidth)/10);
            place-items: center;
            cursor: pointer;
          }
          .btn_source {
            width: calc(var(--remotewidth)/5.9);
            height: calc(var(--remotewidth)/8.125);
            margin: calc(var(--remotewidth)/18.57) auto calc(var(--remotewidth)/20);
          }
          .btn-color {
            width: 70%;
            height: 55%;
            margin: auto;
          }
          .icon_source {
            height: 100%;
            width: 100%}
          .btn-input, .btn-input-on {
            font-size: calc(var(--remotewidth)/18.5);
            height: calc(var(--remotewidth)/7.2226);
            border-width: 0;
            border-radius: calc(var(--remotewidth)/20);
            margin: calc(var(--remotewidth)/47);
            place-items: center;
            display: list-item;
            cursor: pointer;
          }
          .btn-input {
            background-color: var(--remote-button-color);
            color: var(--remote-text-color);
            border: solid 2px var(--remote-color);
          }
          .btn-input-on {
            background-color: var(--primary-color);
            color: #fff;
          }
          .bnt_sound_icon_width {
            width: calc(var(--remotewidth)/3);
          }
          .bnt_sound_text_width {
            width: calc(var(--remotewidth)/2.6);
          }
          .btn_sound_off, .btn_sound_on {
            font-size: calc(var(--remotewidth)/25);
            height: calc(var(--remotewidth)/9.3);
            border-width: 0;
            border-radius: calc(var(--remotewidth)/20);
            margin: auto;
            display: block;
            cursor: pointer;
          }
          .btn_sound_on {
            background-color: var(--primary-color);
            color: #fff;
          }
          .btn_sound_off {
            background-color: var(--remote-button-color);
            color: var(--remote-text-color);
            border: solid 2px var(--remote-color);
          }
          .overlay {
            background-color: rgba(0, 0, 0, .02);
          }
          .flat-high {
            width: 70%;
            height: 37%}
          .flat-low {
            width: 70%;
            height: 65%}
          .btn-flat {
            background-color: var(--remote-button-color);
            color: var(--remote-text-color);
            font-size: calc(var(--remotewidth)/18.75);
            border-width: 0;
            border-radius: calc(var(--remotewidth)/10);
            margin: auto;
            display: grid;
            place-items: center;
            display: inline-block;
            cursor: pointer;
          }


          .ok_button {
            display: flex;
            color: var(--remote-text-color);
            justify-content: center;
            align-items: center;
            border: solid 3px var(--ha-card-background);
            border-radius: 100%;
            font-size: calc(var(--remotewidth)/16.6);
            cursor: pointer;

          }

          .vol_text_value {
            // width: 40px;
            background-color: transparent;
            border: none;
            text-align: center;
            color: var(--primary-text-color);
            font-size: calc(var(--remotewidth)/14);

        `;
  }
}
