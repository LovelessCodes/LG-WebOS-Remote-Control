#!/bin/bash
# lg_tv.sh - control a rooted LG webOS TV from a shell.
#
# Used by this card's `settings:` block through a Home Assistant shell_command.
# The card cannot reach these TV APIs itself: they refuse Home Assistant's webOS
# (SSAP) connection with "Denied method call" / "Access denied", so the calls are
# made over SSH as root, on the TV's own Luna bus.
#
# Requirements: a rooted TV (Homebrew Channel / rootmy.tv) with SSH enabled, and
# this machine's key in /home/root/.ssh/authorized_keys on the TV.
#
# Usage:
#   LG_TV_HOST=<ip> ./lg_tv.sh backlight  <0-100>       # OLED Light / Backlight
#   LG_TV_HOST=<ip> ./lg_tv.sh backlight-get            # its value as JSON, for HA
#   LG_TV_HOST=<ip> ./lg_tv.sh brightness <0-100>       # black level, not luminance
#   LG_TV_HOST=<ip> ./lg_tv.sh sleeptimer <off|1-1440>  # whole minutes, off cancels
#   LG_TV_HOST=<ip> ./lg_tv.sh sleepremain              # remaining sleep timer, JSON
#   LG_TV_HOST=<ip> ./lg_tv.sh keyhold ENTER 1200       # hold a key for 1200 ms
#   LG_TV_HOST=<ip> ./lg_tv.sh poweroff
#
# Env:
#   LG_TV_HOST  TV address, required
#   LG_TV_KEY   private key, default /config/ssh/lg_tv_key
#   LG_TV_USER  ssh user, default root
#   LG_TV_EVENT input device for keyhold, e.g. /dev/input/event0 (default: autodetect)

TV_HOST="${LG_TV_HOST:-}"
KEY="${LG_TV_KEY:-/config/ssh/lg_tv_key}"
TV_USER="${LG_TV_USER:-root}"
EVENT="${LG_TV_EVENT:-}"

set -u

if [ -z "$TV_HOST" ]; then
  echo "LG_TV_HOST is not set" >&2
  exit 2
fi

# keyhold writes key-down, waits, then key-up to the TV's remote input device.
# The standard SSAP/button APIs send a complete press with no duration, so this
# is the only way to hand the TV a genuinely held key.
if [ "${1:-}" = "keyhold" ]; then
  case "${2:-}" in
    enter | ok | ENTER | OK) KEY_CODE=28 ;;
    '' | *[!0-9]*) echo "keyhold needs ENTER or a numeric Linux key code" >&2; exit 2 ;;
    *) KEY_CODE="$2" ;;
  esac
  case "${3:-}" in
    '' | *[!0-9]*) echo "keyhold needs a duration in milliseconds" >&2; exit 2 ;;
  esac
  if [ "$KEY_CODE" -gt 65535 ]; then
    echo "keyhold key code must be 0-65535" >&2
    exit 2
  fi
  if [ "$3" -lt 10 ] || [ "$3" -gt 5000 ]; then
    echo "keyhold duration must be 10-5000 milliseconds" >&2
    exit 2
  fi
  CODE_LO=$(printf '\\%03o' $((KEY_CODE & 255)))
  CODE_HI=$(printf '\\%03o' $((KEY_CODE >> 8)))
  MS_US=$(( $3 * 1000 ))
  MS_SEC=$(printf '%d.%03d' $(( $3 / 1000 )) $(( $3 % 1000 )))
  REMOTE=$(cat <<EOF
BS=16
TIME='\000\000\000\000\000\000\000\000'
if [ "\$(getconf LONG_BIT 2>/dev/null)" = "64" ] || [ "\$(uname -m 2>/dev/null)" = "aarch64" ]; then
  BS=24
  TIME='\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000'
fi
CODE_LO='$CODE_LO'
CODE_HI='$CODE_HI'
DOWN="\$TIME\001\000\$CODE_LO\$CODE_HI\001\000\000\000"
UP="\$TIME\001\000\$CODE_LO\$CODE_HI\000\000\000\000"
SYN="\$TIME\000\000\000\000\000\000\000\000"
DEV='$EVENT'
[ -n "\$DEV" ] || DEV=\$(awk '/^N: Name=/ {found=(\$0 ~ /LGE RCU|LG RCU|Smart Remote RCU/)} found && /^H: Handlers=/ {for (i=1;i<=NF;i++) if (\$i ~ /^event[0-9]+\$/) {print "/dev/input/" \$i; exit}}' /proc/bus/input/devices 2>/dev/null)
[ -n "\$DEV" ] || DEV=/dev/input/event1
printf '%b' "\$DOWN" | dd of="\$DEV" bs=\$BS count=1 2>/dev/null || exit 3
printf '%b' "\$SYN" | dd of="\$DEV" bs=\$BS count=1 2>/dev/null || exit 3
if command -v usleep >/dev/null 2>&1; then usleep $MS_US; else sleep $MS_SEC; fi
printf '%b' "\$UP" | dd of="\$DEV" bs=\$BS count=1 2>/dev/null || exit 3
printf '%b' "\$SYN" | dd of="\$DEV" bs=\$BS count=1 2>/dev/null || exit 3
EOF
)
  exec ssh -T -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ConnectTimeout=8 \
    "$TV_USER@$TV_HOST" "$REMOTE"
fi

case "${1:-}" in
  backlight)
    case "${2:-}" in
      '' | *[!0-9]*) echo "backlight needs a number 0-100" >&2; exit 2 ;;
    esac
    if [ "$2" -gt 100 ]; then echo "backlight needs a number 0-100" >&2; exit 2; fi
    URI="com.webos.service.settings/setSystemSettings"
    PAYLOAD="{\"category\":\"picture\",\"settings\":{\"backlight\":\"$2\"}}"
    ;;
  brightness)
    case "${2:-}" in
      '' | *[!0-9]*) echo "brightness needs a number 0-100" >&2; exit 2 ;;
    esac
    if [ "$2" -gt 100 ]; then echo "brightness needs a number 0-100" >&2; exit 2; fi
    URI="com.webos.service.settings/setSystemSettings"
    PAYLOAD="{\"category\":\"picture\",\"settings\":{\"brightness\":\"$2\"}}"
    ;;
  sleeptimer)
    # The countdown is owned by tv-reservation-agent, not the settings service.
    # Writing the sleepTimer setting does nothing to a live countdown, and
    # "off" there does not cancel one. The agent API is:
    #   arm:    timer/sleep/add {"sleepTimeMinute": N}
    #   cancel: timer/sleep/add {"sleepTimeMinute": 0}
    case "${2:-}" in
      off | 0) MIN=0 ;;
      '' | *[!0-9]*) echo "sleeptimer needs off, or whole minutes 1-1440" >&2; exit 2 ;;
      *) MIN="$2" ;;
    esac
    if [ "$MIN" -gt 1440 ]; then
      echo "sleeptimer needs off, or whole minutes 1-1440" >&2
      exit 2
    fi
    URI="com.webos.service.tvReservationAgent/timer/sleep/add"
    PAYLOAD="{\"sleepTimeMinute\":$MIN}"
    ;;
  sleepremain)
    URI="com.webos.service.tvReservationAgent/timer/sleep/getRemainTime"
    PAYLOAD='{}'
    ;;
  backlight-get)
    # The TV's own value, as JSON: a Home Assistant command_line sensor reads
    # it back with a value_template of {{ value_json.settings.backlight }}.
    URI="com.webos.service.settings/getSystemSettings"
    PAYLOAD='{"category":"picture","keys":["backlight"]}'
    ;;
  poweroff)
    URI="com.webos.service.tvpower/power/powerOff"
    PAYLOAD='{"reason":"remoteKey"}'
    ;;
  *)
    echo "usage: $0 {backlight|brightness} <0-100> | backlight-get | sleeptimer <off|minutes> | sleepremain | poweroff" >&2
    exit 2
    ;;
esac

# -tt is mandatory. Over a non-interactive ssh command with no tty, luna-send
# prints nothing and silently does nothing, with exit code 0.
exec ssh -tt -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ConnectTimeout=8 \
  "$TV_USER@$TV_HOST" "luna-send -n 1 -f 'luna://$URI' '$PAYLOAD'"
