import { CopyAddressButton } from "@/components/site/copy-address-button";
import type { SiteIdentity } from "@/lib/site/public-configuration";

/**
 * Published location only. Renders nothing when no location is published —
 * the honest state until the owner configures and publishes one (C7 §9–10).
 */
export function LocationCard({
  location,
  shortName,
}: Readonly<{ location: SiteIdentity["location"]; shortName: string }>) {
  if (!location) return null;
  const lines = [
    location.name,
    location.street,
    [location.city, location.region].filter(Boolean).join(", ") || null,
    [location.postal_code, location.country].filter(Boolean).join(" ") || null,
  ].filter((line): line is string => Boolean(line));
  const address = lines.join(", ");
  return (
    <section className="location-foundation location-card" aria-labelledby="location-heading">
      <div className="location-copy">
        <p className="section-kicker">Location</p>
        <h2 id="location-heading">Find {shortName}.</h2>
        <address className="location-address">
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </address>
        {location.service_area ? <p>{location.service_area}</p> : null}
        <div className="location-actions">
          {location.maps_url ? (
            <a href={location.maps_url} rel="noreferrer" target="_blank">
              View on Map
            </a>
          ) : null}
          {location.directions_url ? (
            <a href={location.directions_url} rel="noreferrer" target="_blank">
              Get Directions
            </a>
          ) : null}
          {address ? <CopyAddressButton address={address} /> : null}
        </div>
      </div>
      {location.maps_url ? (
        <a
          className="location-map-preview"
          href={location.maps_url}
          rel="noreferrer"
          target="_blank"
        >
          <span>Open in Maps</span>
        </a>
      ) : null}
    </section>
  );
}
