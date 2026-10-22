# LG-WebOS-Remote-Control

Remote Control for LG TV WebOS

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/hacs/integration)
[![buymeacoffee_badge](https://img.shields.io/badge/Donate-buymeacoffe-ff813f?style=flat)](https://www.buymeacoffee.com/madmicio)

the project is now curated and developed in collaboration with [Piotr Machowski](https://github.com/PiotrMachowski)

![all](example/remote.png)

![all](example/channels.jpg)

browser_mod is required for this channel panel (you can find it [here](https://github.com/thomasloven/hass-browser_mod))

custom card: "card-channel-pad" is required (you can find it [here](https://github.com/madmicio/channel-pad))

# New features

### - editor card

### - ovverride buttons services

## hacs Card install

1. Find and install `LG WebOS Remote Control` plugin

2. Add a reference inside your resources config:

```yaml
resources:
  - type: module
    url: /hacsfiles/LG-WebOS-Remote-Control/lg-remote-control.js
```

### Manual install

1. Download and copy `lg-remote-control.js` from (https://github.com/madmicio/LG-WebOS-Remote-Control/releases/latest) into your custom components directory.

2. Add a reference `lg-remote-control.js` inside your resources config:

```yaml
resources:
  - url: /local/"your_directory"/lg-remote-control.js
    type: module
```

# lovelace config: default view

```yaml
- type: "custom:lg-remote-control"
  entity: media_player.tv_lg_55c8
  mac: xx:xx:xx:xx
```

### Main Options

| Name            | Type   | Default      | Supported options          | Description                                                                                                 |
| --------------- | ------ | ------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `type`          | string | **Required** | `custom:lg-remote-control` | Type of the card                                                                                            |
| `entity`        | string | **Required** |                            | tv entity                                                                                                   |
| `name`          | string | **Option**   |                            | tv name                                                                                                     |
| `mac`           | string | **Option**   |                            | tv mac address (if not specified, you need to create an automation to perform the action to turn the TV on) |
| `ampli_antity`  | string | **Option**   |                            | your AV receiver entity (see option config)                                                                 |
| `colors`        | string | **Option**   |                            | list of color options                                                                                       |
| `channels`      |        | **Option**   |                            | list of channel in popup                                                                                    |
| `sources`       |        | **Option**   |                            | list of custom app. if not set, default apps will be displayed                                              |
| `color_buttons` |        | **Option**   | enable                     | display color buttons: RED GREEN YELLOW BLUE                                                                |
| `settings`      | object | **Option**   |                            | adds backlight and sleep timer controls (see "Backlight & sleep timer")                                     |

### Source Options

| Name   | Type   | Default      | Supported options | Description                                                                                                                                        |
| ------ | ------ | ------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon` | string | **Required** | 'mdi:netflix'     | url of the image to be displayed in the channel pad popup                                                                                          |
| `name` | string | **Required** | app name          | you have to write the exact name of the app to launch. you can find the correct name in the state of your media_player entity under "source_list:" |

```yaml
sources:
  - icon: "mdi:power"
    name: "Netflix"
  - icon: "mdi:youtube"
    name: "YouTube"
```

**Note:** `disney` `amazon` and `dazn` are special, icon you must enter them like this:

```yaml
- icon: disney
  name: Disney+
- icon: amazon
  name: Prime Video
- icon: dazn
  name: Dazn
```

### Channels Options

| Name     | Type   | Default      | Supported options                      | Description                                               |
| -------- | ------ | ------------ | -------------------------------------- | --------------------------------------------------------- |
| `image`  | url    | **Required** | /local/your_dir/tv_logo/your_image.png | url of the image to be displayed in the channel pad popup |
| `number` | string | **Required** | number                                 | TV channel number                                         |

```yaml
channels:
  - image: /local/lg_remote/tv_logo/Rai 1 HD.png
    number: "501"
  - image: /local/lg_remote/tv_logo/Rai 2 HD.png
    number: "502"
  - image: /local/lg_remote/tv_logo/Rai 3 HD.png
    number: "503"
```

## Ovverride buttons services

with version 2.0 the possibility of overriding the functionality of the button is introduced. you therefore have the possibility of calling a Home assistant service at your convenience

here are the [override keys](https://github.com/madmicio/LG-WebOS-Remote-Control/blob/master/Override_buttons.md) and the yaml configuration.

## Backlight & sleep timer

Two optional controls, shown under the sources row when configured: a slider for the TV's
OLED Light / Backlight, and a row of sleep timer buttons.

The card cannot reach these TV APIs by itself. They are internal webOS services that refuse
Home Assistant's webOS connection (`Denied method call`, `Access denied`), so a privileged
caller on the TV has to run them. `extras/lg_tv.sh` is a small script that does this over
SSH on a **rooted** TV, and the card simply calls it as an ordinary Home Assistant service.
Any service that does the same job works just as well.

### 1. TV

Rooted TV with SSH enabled (Homebrew Channel or rootmy.tv), and a key for Home Assistant in
`/home/root/.ssh/authorized_keys`. Copy:

- `extras/lg_tv.sh` to `/config/scripts/lg_tv.sh` (`chmod +x`)
- the private key to `/config/ssh/lg_tv_key` (`chmod 600`)

Test it from a terminal, with the TV on:

```bash
LG_TV_HOST=192.168.1.107 LG_TV_KEY=/config/ssh/lg_tv_key /config/scripts/lg_tv.sh backlight 40
```

### 2. Home Assistant

```yaml
# configuration.yaml
shell_command:
  lg_tv_backlight: "/config/scripts/lg_tv.sh backlight {{ level }}"
  lg_tv_sleeptimer: "/config/scripts/lg_tv.sh sleeptimer {{ minutes }}"
```

Reload with Developer tools → YAML → _Reload shell_command_ (or restart Home Assistant).

### 3. Card

```yaml
type: custom:lg-remote-control
entity: media_player.lg_webos_tv
settings:
  backlight:
    service: shell_command.lg_tv_backlight
    data:
      level: "$value"
    default: 100
  sleep_timer:
    service: shell_command.lg_tv_sleeptimer
    data:
      minutes: "$value"
    options: [off, 10, 20, 30, 60, 120]
```

| Name                           | Type   | Default | Description                                                                                |
| ------------------------------ | ------ | ------- | ------------------------------------------------------------------------------------------ |
| `settings.backlight`           | object |         | backlight slider. omitted, no slider is shown                                              |
| `settings.backlight.service`   | string |         | service to call, e.g. `shell_command.lg_tv_backlight`                                      |
| `settings.backlight.data`      | object |         | service data. `$value` is the slider position, 0-100                                       |
| `settings.backlight.default`   | number | 100     | value the slider starts at                                                                 |
| `settings.backlight.entity`    | string |         | entity holding the TV's current value, e.g. a `command_line` sensor. The slider mirrors it |
| `settings.sleep_timer`         | object |         | sleep timer slider. omitted, no slider is shown                                            |
| `settings.sleep_timer.service` | string |         | service to call, e.g. `shell_command.lg_tv_sleeptimer`                                     |
| `settings.sleep_timer.data`    | object |         | service data. `$value` is the chosen option                                                |
| `settings.sleep_timer.options` | list   | all     | which options the slider snaps to. default `off, 10, 20, 30, 60, 90, 120, 180, 240`        |
| `settings.sleep_timer.default` | string |         | which option starts selected                                                               |

Both blocks are independent, and neither is required.

### $value

`$value` is replaced in every string under `data`, including nested objects and lists. On its
own it keeps the value's type, so `{"sleepTimeMinute": "$value"}` sends a number; inside a
longer string it is interpolated as text, e.g. `"level=$value"`.

### Reading the value back

The card cannot show what the TV is actually set to on its own: the value lives on the TV,
and nothing in Home Assistant can read it over the webOS connection (`Access denied`, as
above). The script can, and a `command_line` sensor carries it back:

```yaml
# configuration.yaml
command_line:
  - sensor:
      name: LG TV backlight
      unique_id: lg_tv_backlight
      command: "/config/scripts/lg_tv.sh backlight-get"
      value_template: "{{ value_json.settings.backlight }}"
      unit_of_measurement: "%"
```

Point the slider at it, and it shows the TV's value and follows it, including changes made
with the remote:

```yaml
settings:
  backlight:
    entity: sensor.lg_tv_backlight
    service: shell_command.lg_tv_backlight
    data:
      level: "$value"
```

Dragging still writes through the service, and the dragged value stays on screen while the
sensor catches up, rather than snapping back to a stale reading. The sensor polls every 60
seconds by default; `scan_interval` on the sensor changes that.

Two things to know. While the TV is in standby the command fails and the sensor reads
unavailable, so the slider falls back to its `default`. And the value is stored per picture
mode and input, so it reflects the mode you set, not all of them at once.

### Notes

- **Backlight is stored per picture mode and input.** Dimming one mode leaves the others
  alone: an HDR or Dolby Vision mode keeps its own value, which comes back when it is used.
- **Sleep timer** takes whole minutes (`off` or `0` cancels a running countdown). Writing the
  TV's `sleepTimer` setting does not control a live countdown; `extras/lg_tv.sh` talks to
  `tv-reservation-agent`, the daemon that owns it.
- The commands need the TV to be on. In deep standby SSH is gone and the call fails; check
  the Home Assistant log.
- `BACKLIGHT` and `SLEEP_TIMER` can be remapped through the `keys:` option like any other key
  (see [override keys](Override_buttons.md)).

## AV receiver volume control Options

option dedicated to all those with problems controlling the volume of the AV Receiver through HDMI-cec commands.
if the ampli_entity item is configured, and when the sound output is set to external_arc (HDMI) or external_optical (optical output) then the remote control buttons will no longer act on the volume of the television, but on the volume of your receiver.

```yaml
type: "custom:lg-remote-control"
entity: media_player.lg_webos_tv_oled55c8pla
mac: xx:xx:xx:xx:xx:xx
ampli_entity: media_player.marantz_sr6010
...
```

### power on/off Receiver

it would have been possible to implement automatic power on and choice of the input source of the Receiver when the sound output is set to external_arc (HDMI) or external_optical (optical output) and turn off the Receiver when any other sound output is set, but the card of home assistants do not work in background but only when rendered. for this and other reasons it is preferable to use a home assistant automation that manages the process, so the actions will also take place when operating with the physical remote control rather than with the home assistant card.

Below is an example of code:

```yaml
alias: "tv_receiver"
trigger:
  - platform: template
    value_template: "{{ state_attr('media_player.lg_webos_tv_oled55c8pla', 'sound_output') == 'external_arc' }}"
    id: "external_arc"
  - platform: template
    value_template: "{{ state_attr('media_player.lg_webos_tv_oled55c8pla', 'sound_output') != 'external_arc' }}"
    id: "tv_speaker"
  - platform: state
    entity_id: media_player.lg_webos_tv_oled55c8pla
    from: "off"
    to: "on"
    id: "tv_on"
  - platform: state
    entity_id: media_player.lg_webos_tv_oled55c8pla
    from: "on"
    to: "off"
    id: "tv_off"
action:
  - choose:
      - conditions: "{{ trigger.id == 'tv_on' }}"
        sequence:
          - condition: template
            value_template: "{{ state_attr('media_player.lg_webos_tv_oled55c8pla', 'sound_output') == 'external_arc' }}"
          - service: media_player.turn_on
            target:
              entity_id: media_player.marantz_sr6010
          - wait_template: "{{ is_state('media_player.marantz_sr6010', 'on') }}"
          - service: media_player.select_source
            data:
              source: TV Audio
            target:
              entity_id: media_player.marantz_sr6010
      - conditions: "{{ trigger.id == 'external_arc'}}"
        sequence:
          - if: "{{ is_state('media_player.marantz_sr6010', 'on') }}"
            then:
              - service: media_player.select_source
                data:
                  source: TV Audio
                target:
                  entity_id: media_player.marantz_sr6010
            else:
              - service: media_player.turn_on
                target:
                  entity_id: media_player.marantz_sr6010
              - wait_template: "{{ is_state('media_player.marantz_sr6010', 'on') }}"
              - service: media_player.select_source
                data:
                  source: TV Audio
                target:
                  entity_id: media_player.marantz_sr6010
      - conditions: "{{ trigger.id == 'tv_speaker' or trigger.id == 'tv_off' }}"
        sequence:
          - service: media_player.turn_off
            target:
              entity_id: media_player.marantz_sr6010
```

## MENU button

to display the "quick menu" (MENU function of WEBOS integration), long press, longer than 1 second, on the "HOME" button

## OK button

a short tap sends `ENTER`. holding past `repeat.ok_long_press` (default `1000` ms) fires the
`ENTER_LONG_PRESS` key with the measured hold time in `$value`.

Home Assistant's `webostv.button` action can only send a complete press, not key-down/key-up,
so without an override `ENTER_LONG_PRESS` sends `MENU` as a substitute.

### Sending a genuinely held ENTER

To make the TV receive a real held key, use the `keyhold` command in
[extras/lg_tv.sh](extras/lg_tv.sh) on a **rooted** TV with SSH (the same setup as the backlight
controls). It writes key-down, waits for the measured hold, then key-up.

```yaml
# configuration.yaml
shell_command:
  lg_tv_keyhold: "/config/scripts/lg_tv.sh keyhold {{ key }} {{ hold_ms }}"
```

```yaml
# card
repeat:
  ok_long_press: 1000
keys:
  ENTER_LONG_PRESS:
    service: shell_command.lg_tv_keyhold
    data:
      key: ENTER
      hold_ms: "$value"
```

`$value` is the number of milliseconds OK was held. The helper is called when you release OK, so
the held key starts at release and lasts for the measured time.

the hold delay is `repeat.ok_long_press` (milliseconds, default `1000`), and the action can be
remapped with the `ENTER_LONG_PRESS` key: see the [override keys](https://github.com/madmicio/LG-WebOS-Remote-Control/blob/master/Override_buttons.md).

## Color Management

color customization implemented through the section

```yaml
colors:
```

- buttons: set buttons background color - default: "#f2f0fa"
- texts: set buttons color - default: "var(--primary-text-color)"
- background: set remote background color - default: "var(--primary-background-color)"

```yaml
colors:
  buttons: var(--deactive-background-button-color)
  texts: pink
  background: rgba(95,155,234)
```

**NOTE: option in "your-theme.yaml**

```yaml
#button
deactive-background-button-color: "#f2f0fa"
```

### Colors Options

| Name          | Type   | Default                 | Supported options | Description              |
| ------------- | ------ | ----------------------- | ----------------- | ------------------------ |
| `buttons`     | string | **Option**              | color formats     | buttons background-color |
| `texts`       | string | **Option**              | color formats     | number and icon color    |
| `background:` | string | **Option**              | color formats     | list of color options    |
| `border:`     | string | --app-header-text-color | color formats     | remote border color      |

### dimensions Options

| Name           | Type | Default    | Supported options | Description                          |
| -------------- | ---- | ---------- | ----------------- | ------------------------------------ |
| `scale`        |      | **Option** | number            | scale factor; default 1              |
| `border_width` |      | **Option** | number            | set remote border width; default 1px |

# Channel pad

in this version of the card there is no longer a "channel pad popup" with preset channels.
this is to give each user the ability to create his own list.

"channels" configuration is not mandatory. if "channels" is not configured the remote control will work normally but you will not be able to use the channel pad.
pressing the button on the remote control you will receive this message.
![all](example/source_error.png)

# New Features Config

in this new version we have implemented some new features:

1. customizable and incremental app button

   option: **sources:** ( if you do not configure this option, the remote control will display the default apps)

2. customizable channel pad

   option: **channels:** ( if you do not configure this option, on button click you receive an error message)

3. customizable scale:

   option: **scale:** ( this option reduces or enlarges the size of the remote control. we are testing this option )

# lovelace config: custom view

```yaml
- type: "custom:lg-remote-control"
  entity: media_player.tv_lg_55c8
  mac: xx:xx:xx:xx
  sources:
    - name: Netflix
      icon: "mdi:netflix"
    - name: Disney+
      icon: disney
    - name: Dazn
      icon: dazn
    - name: YouTube
      icon: "mdi:youtube-tv"
    - name: HDMI 1
      icon: "mdi:video-input-hdmi"
    - name: HDMI 2
      icon: "mdi:video-input-hdmi"
  channels:
    - image: /local/images/tv_logo/channel_1.png
      number: "1"
    - image: /local/images/tv_logo/channel_2.png
      number: "1"
```

**note: disney and danz are special icon. so you you must enter it as in the example**

## dimnensions option:

the remote control supports the scale option to adjust its size

```yaml
- type: "custom:lg-remote-control"
  entity: media_player.tv_lg_55c8
  mac: xx:xx:xx:xx
  dimensions:
    scale: 0.98
    border_width: 3px
```

## Install Tv Logo

1. download tv_logo
2. directory put the images file where you prefer (we suggest: www / images / tv_logo)
3. calls the image in the configuration as in the example

```yaml
image: /local/your_directory/your_file.png
```

**new_tv logo**
at this moment only tv logo of italian tv are available.
users who produce other logos are invited to share them, so we could have a complete and international library
**new logo spec**
height: 268px
width: 171px
background: transparent
image must have 10px margin like this example:

![all](example/logo_example.png)![all](example/logo_area3.png)

## Popup Buttons

![all](example/popup.png)

# Development

## Preview the card without Home Assistant

`dev/preview.html` runs the built card against a fake frontend. The two elements the card
renders are stubbed, and a fake `hass` writes every service call to a log beside the card,
so pressing a button shows exactly what would be sent to Home Assistant. The card config is
editable on the page, and the card rebuilds from it.

The page carries Home Assistant's two default themes — the light and dark palettes from the
frontend's own `color.globals.ts` — and the switch beside the title flips between them, so
the card can be checked as it will look in either. The choice is remembered, and `?theme=dark`
opens in the dark theme directly.

```bash
bun run build # or: bun run start, to rebuild on change
bun run preview # serves the repository on port 8788 and prints the URL
```

`?bundle=...` loads a different build, which is handy for comparing against a release, and
`?theme=dark` opens in the dark theme:

```
http://localhost:8788/dev/preview.html?bundle=../released/lg-remote-control.js
http://localhost:8788/dev/preview.html?theme=dark
```

The port is 8788; `PORT=8789 bun run preview` uses another one.

## Checks

```bash
bun run lint # oxlint
bun run fmt:check # oxfmt
bun run typecheck # tsc-rs
bun run build # rolldown
```

All four run in CI on every pull request.

<a href="https://www.buymeacoffee.com/madmicio" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" style="height: 51px !important;width: 217px !important;" ></a>
