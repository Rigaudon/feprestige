"use client";

import Image from "next/image";
import { useState } from "react";

import { formatRole } from "@/wom/format";

// OSRS icon assets (metrics, account types, group roles) copied from the
// Wise Old Man web app (public/img). Keyed by the same slugs the WOM API uses,
// so a metric/type/role string maps straight to a filename. Missing files (e.g.
// a boss too new to have art yet) fall back to nothing via onError.

// Account types worth flagging next to a name. Regular/unknown accounts get no
// badge — the absence is the signal.
const NOTABLE_TYPES = new Set(["ironman", "hardcore", "ultimate"]);

export function MetricIcon({
  metric,
  size = 20,
  className,
}: {
  metric: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={`/img/metrics/${metric}.png`}
      alt=""
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 ${className ?? ""}`}
    />
  );
}

export function PlayerTypeIcon({
  type,
  className,
}: {
  type: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!type || !NOTABLE_TYPES.has(type) || failed) return null;
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <Image
      src={`/img/player_types/${type}.png`}
      alt={`${label} account`}
      title={label}
      width={10}
      height={13}
      unoptimized
      onError={() => setFailed(true)}
      style={{ imageRendering: "pixelated" }}
      className={`inline-block shrink-0 ${className ?? ""}`}
    />
  );
}

export function GroupRoleIcon({
  role,
  size = 16,
  className,
}: {
  role: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // WOM stores the plain "member" role under the "minion" icon filename.
  const slug = !role || role === "member" ? "minion" : role;
  if (failed) return null;
  return (
    <Image
      src={`/img/group_roles/${slug}.png`}
      alt=""
      title={formatRole(role)}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 ${className ?? ""}`}
    />
  );
}
