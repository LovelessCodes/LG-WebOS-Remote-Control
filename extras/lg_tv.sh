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
#   LG_TV_HOST=<ip> ./lg_tv.sh brightness <0-100>       # black level, not luminance
#   LG_TV_HOST=<ip> ./lg_tv.sh sleeptimer <off|1-1440>  # whole minutes, off cancels
#   LG_TV_HOST=<ip> ./lg_tv.sh sleepremain              # remaining sleep timer, JSON
#   LG_TV_HOST=<ip> ./lg_tv.sh poweroff
#
# Env:
#   LG_TV_HOST  TV address, required
#   LG_TV_KEY   private key, default /config/ssh/lg_tv_key
#   LG_TV_USER  ssh user, default root

TV_HOST="${LG_TV_HOST:-}"
KEY="${LG_TV_KEY:-/config/ssh/lg_tv_key}"
TV_USER="${LG_TV_USER:-root}"

set -u

if [ -z "$TV_HOST" ]; then
  echo "LG_TV_HOST is not set" >&2
  exit 2
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
  poweroff)
    URI="com.webos.service.tvpower/power/powerOff"
    PAYLOAD='{"reason":"remoteKey"}'
    ;;
  *)
    echo "usage: $0 {backlight|brightness} <0-100> | sleeptimer <off|minutes> | sleepremain | poweroff" >&2
    exit 2
    ;;
esac

# -tt is mandatory. Over a non-interactive ssh command with no tty, luna-send
# prints nothing and silently does nothing, with exit code 0.
exec ssh -tt -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ConnectTimeout=8 \
  "$TV_USER@$TV_HOST" "luna-send -n 1 -f 'luna://$URI' '$PAYLOAD'"
