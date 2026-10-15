export function getMediaPlayerEntitiesByPlatform(hass, platformName) {
  let entities = Object.keys(hass.entities).filter(
    (eid) => hass.entities[eid].platform === platformName,
  );
  const re = /media_player/;
  return entities.filter((a) => re.exec(a));
}

const VALUE_TOKEN = "$value";

export function substituteValue(value, replacement) {
  if (Array.isArray(value)) return value.map((v) => substituteValue(v, replacement));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = substituteValue(value[key], replacement);
    return out;
  }
  if (typeof value === "string" && value.includes(VALUE_TOKEN)) {
    // a lone token keeps the replacement's own type, so a service that wants a
    // number gets one; an embedded token is always interpolated as text.
    if (value === VALUE_TOKEN) return replacement;
    return value.split(VALUE_TOKEN).join(String(replacement));
  }
  return value;
}
