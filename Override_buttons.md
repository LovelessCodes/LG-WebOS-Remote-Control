## Overriding key actions

Example config:

```yaml
type: custom:lg-remote-control
av_receiver_family: anthemav
entity: media_player.lg_webos_smart_tv
is_smart_tv: "true"
colors:
  buttons: red
  text: blue
  background: blue
projectorentity: ""
mac: "00:11:22:33:44:66"
keys:
  LEFT:
    service: light.toggle
    data:
      entity_id: light.tv
  VOLUME_UP:
    service: light.toggle
    data:
      entity_id: light.tv
```

available keys:

- `"1"`
- `"2"`
- `"3"`
- `"4"`
- `"5"`
- `"6"`
- `"7"`
- `"8"`
- `"9"`
- `"0"`
- `"UP"`
- `"LEFT"`
- `"ENTER"`
- `"ENTER_LONG_PRESS"`
- `"RIGHT"`
- `"BACK"`
- `"DOWN"`
- `"EXIT"`
- `"RED"`
- `"GREEN"`
- `"YELLOW"`
- `"BLUE"`
- `"HOME"`
- `"CHANNELUP"`
- `"MUTE"`
- `"INFO"`
- `"CHANNELDOWN"`
- `"PLAY"`
- `"PAUSE"`
- `"STOP"`
- `"REWIND"`
- `"RECORD"`
- `"FAST_FORWARD"`
- `"POWER"`
- `"VOLUME_UP"`
- `"VOLUME_DOWN"`

`ENTER_LONG_PRESS` fires when the OK button is held past `repeat.ok_long_press` (default `1000` ms). The measured hold is available as `$value` in the override's `data`, in milliseconds. Without an override it sends the `MENU` button.

## Long-press keys

Add `<KEY>_LONG_PRESS` for a long-press action on that key. Supported keys are `0`-`9`, `BACK`, `EXIT`, `INFO`, `MUTE`, `RED`, `GREEN`, `YELLOW`, `BLUE`, `PLAY`, `PAUSE`, `STOP`, `REWIND`, `RECORD`, `FAST_FORWARD` and `POWER`. The delay is `repeat.key_long_press` (default `600` ms), and the measured hold is available as `$value`.

## Text keys

- `"TEXT_SEND"`
- `"TEXT_DELETE"`
- `"TEXT_ENTER"`

`TEXT_SEND` receives the typed text as `$value`; the other two take no value.
