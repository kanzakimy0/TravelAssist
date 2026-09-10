export interface PlannerVerifiedStationRecord {
  provider: "ekiworld";
  referenceId: string | null;
  displayName: string;
  evidenceUrl: string;
}

export const PLANNER_VERIFIED_STATIONS: Readonly<
  Record<string, PlannerVerifiedStationRecord>
> = {
  东京晴空塔: {
    provider: "ekiworld",
    referenceId: null,
    displayName: "とうきょうスカイツリー",
    evidenceUrl: "https://www.tobu.co.jp/railway/guide/station/info/1103.html",
  },
  银座散步: {
    provider: "ekiworld",
    referenceId: null,
    displayName: "銀座",
    evidenceUrl: "https://www.tokyometro.jp/station/ginza/index.html",
  },
  东京站出发: {
    provider: "ekiworld",
    referenceId: null,
    displayName: "東京",
    evidenceUrl:
      "https://www.jreast.co.jp/estation/station/info.aspx?StationCd=1039",
  },
  富士急乐园: {
    provider: "ekiworld",
    referenceId: null,
    displayName: "富士急ハイランド",
    evidenceUrl: "https://www.fujikyu-railway.jp/stroll-map/",
  },
  箱根汤本: {
    provider: "ekiworld",
    referenceId: null,
    displayName: "箱根湯本",
    evidenceUrl:
      "https://www.hakonenavi.jp/transportation/station/hakone-yumoto/",
  },
  雕刻之森美术馆: {
    provider: "ekiworld",
    referenceId: null,
    displayName: "彫刻の森",
    evidenceUrl:
      "https://www.hakonenavi.jp/transportation/station/chokoku-no-mori/",
  },
};

export function isPlannerVerifiedStation(input: {
  referenceId: string | null;
  displayName: string | null;
}) {
  const reference = input.referenceId?.trim() || null;
  const displayName = input.displayName?.trim() || null;
  return Object.values(PLANNER_VERIFIED_STATIONS).some(
    (station) =>
      station.referenceId === reference && station.displayName === displayName,
  );
}
