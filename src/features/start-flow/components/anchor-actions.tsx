"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";

import type {
  ActivityAnchor,
  AnchorType,
  FlightAnchor,
  HotelAnchor,
  TripAnchors,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { Modal } from "./modal";

const OPTIONS: Array<{ id: AnchorType; label: string }> = [
  { id: "flight", label: "机票" },
  { id: "hotel", label: "酒店" },
  { id: "activity", label: "已订活动" },
];

interface AnchorActionsProps {
  onChange: (value: TripAnchors) => void;
  value: TripAnchors;
}

function makeId(type: AnchorType) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function Field({
  label,
  name,
  optional = false,
  type = "text",
}: {
  label: string;
  name: string;
  optional?: boolean;
  type?: "text" | "date" | "time";
}) {
  return (
    <label className={styles.modalField}>
      <span>
        {label} {optional ? <small>选填</small> : null}
      </span>
      <input name={name} required={!optional} type={type} />
    </label>
  );
}

export function AnchorActions({ onChange, value }: AnchorActionsProps) {
  const [activeType, setActiveType] = useState<AnchorType | null>(null);

  const counts: Record<AnchorType, number> = {
    flight: value.flights.length,
    hotel: value.hotels.length,
    activity: value.activities.length,
  };

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeType) return;

    const data = new FormData(event.currentTarget);
    if (activeType === "flight") {
      const anchor: FlightAnchor = {
        id: makeId("flight"),
        source: "manual",
        departureAirport: String(data.get("departureAirport")),
        arrivalAirport: String(data.get("arrivalAirport")),
        date: String(data.get("date")),
        departureTime: String(data.get("departureTime")),
        flightNumber: String(data.get("flightNumber") ?? ""),
      };
      onChange({ ...value, flights: [...value.flights, anchor] });
    }
    if (activeType === "hotel") {
      const anchor: HotelAnchor = {
        id: makeId("hotel"),
        source: "manual",
        hotelName: String(data.get("hotelName")),
        city: String(data.get("city")),
        checkIn: String(data.get("checkIn")),
        checkOut: String(data.get("checkOut")),
        address: String(data.get("address") ?? ""),
      };
      onChange({ ...value, hotels: [...value.hotels, anchor] });
    }
    if (activeType === "activity") {
      const anchor: ActivityAnchor = {
        id: makeId("activity"),
        source: "manual",
        activityName: String(data.get("activityName")),
        date: String(data.get("date")),
        time: String(data.get("time")),
        location: String(data.get("location")),
        fixed: data.get("fixed") === "on",
        nonCancellable: data.get("nonCancellable") === "on",
      };
      onChange({ ...value, activities: [...value.activities, anchor] });
    }
    setActiveType(null);
  }

  return (
    <section className={styles.anchorGroup} aria-labelledby="anchor-title">
      <div className={styles.anchorActionRow}>
        <h2 id="anchor-title">已有确定安排？</h2>
        <div className={styles.anchorActions}>
          {OPTIONS.map((option) => (
            <button
              data-selected={counts[option.id] > 0}
              key={option.id}
              onClick={() => setActiveType(option.id)}
              type="button"
            >
              ＋ 添加{option.label}
              {counts[option.id] ? ` (${counts[option.id]})` : ""}
            </button>
          ))}
        </div>
      </div>
      {Object.values(counts).some(Boolean) ? (
        <p className={styles.anchorPlaceholder} role="status">
          已保存 {counts.flight} 段机票、{counts.hotel} 家酒店、
          {counts.activity} 项活动；生成方案时会优先固定这些安排。
        </p>
      ) : null}
      {activeType ? (
        <AnchorModal
          key={activeType}
          onClose={() => setActiveType(null)}
          onSubmit={save}
          type={activeType}
        />
      ) : null}
    </section>
  );
}

function AnchorModal({
  onClose,
  onSubmit,
  type,
}: {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  type: AnchorType;
}) {
  const title =
    type === "flight" ? "添加机票" : type === "hotel" ? "添加酒店" : "添加活动";

  return (
    <Modal
      description="当前支持手动输入；数据结构已为搜索、粘贴识别与 AI 导入预留来源字段。"
      onClose={onClose}
      title={title}
    >
      <form className={styles.anchorForm} onSubmit={onSubmit}>
        {type === "flight" ? (
          <>
            <Field label="出发机场" name="departureAirport" />
            <Field label="到达机场" name="arrivalAirport" />
            <Field label="日期" name="date" type="date" />
            <Field label="起飞时间" name="departureTime" type="time" />
            <Field label="航班号" name="flightNumber" optional />
          </>
        ) : null}
        {type === "hotel" ? (
          <>
            <Field label="酒店名" name="hotelName" />
            <Field label="城市" name="city" />
            <Field label="入住日期" name="checkIn" type="date" />
            <Field label="退房日期" name="checkOut" type="date" />
            <Field label="地址 / 位置" name="address" optional />
          </>
        ) : null}
        {type === "activity" ? (
          <>
            <Field label="活动名" name="activityName" />
            <Field label="日期" name="date" type="date" />
            <Field label="时间" name="time" type="time" />
            <Field label="地点" name="location" />
            <label className={styles.toggleField}>
              <input name="fixed" type="checkbox" />
              <span>不可调整</span>
            </label>
            <label className={styles.toggleField}>
              <input name="nonCancellable" type="checkbox" />
              <span>不可取消</span>
            </label>
          </>
        ) : null}
        <div className={styles.modalActions}>
          <span />
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button type="submit">保存</Button>
        </div>
      </form>
    </Modal>
  );
}
