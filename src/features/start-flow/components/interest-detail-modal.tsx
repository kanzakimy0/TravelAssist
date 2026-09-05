"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { Interest } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { Modal } from "./modal";
import { InfoPopover } from "./info-popover";

const DETAIL_OPTIONS: Record<Interest, string[]> = {
  自然风景: ["山岳", "海岸", "湖泊", "森林", "花田"],
  历史文化: ["神社寺院", "城郭", "博物馆", "历史街区"],
  美食: ["寿司", "拉面", "地方料理", "甜品", "清酒"],
  摄影: ["街拍", "风景", "夜景", "建筑", "人文"],
  温泉疗愈: ["温泉旅馆", "露天风吕", "森林疗愈", "海景温泉"],
  艺术展馆: ["现代艺术", "传统工艺", "建筑", "设计展"],
  动漫娱乐: ["动漫圣地", "游戏", "主题咖啡", "周边商店"],
  购物: ["百货商场", "古着", "药妆", "地方特产"],
  城市探索: ["特色街区", "建筑巡游", "咖啡店", "城市夜景"],
  户外活动: ["徒步", "骑行", "滑雪", "水上活动"],
  夜间体验: ["居酒屋", "夜景", "演出", "夜间散步"],
  亲子体验: ["动物园", "科学馆", "亲子手作", "公园"],
  传统体验: ["茶道", "和服", "手作工艺", "传统演艺"],
  主题乐园: ["大型乐园", "角色乐园", "水族馆", "沉浸展览"],
  乡村小镇: ["古镇", "渔村", "田园", "在地市集"],
  季节限定: ["樱花", "红叶", "雪景", "祭典", "花火"],
};

interface InterestDetailModalProps {
  interest: Interest;
  onClose: () => void;
  onConfirm: (values: string[]) => void;
  values: string[];
}

export function InterestDetailModal({
  interest,
  onClose,
  onConfirm,
  values,
}: InterestDetailModalProps) {
  const [selection, setSelection] = useState(values);

  function toggle(value: string) {
    setSelection((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return (
    <Modal
      description="可选填更具体的偏好，让后续方案更贴近您。"
      onClose={onClose}
      title={`${interest}偏好`}
    >
      <p className={styles.modalHelpLabel}>
        选择具体偏好{" "}
        <InfoPopover
          label="具体偏好选择说明"
          text="可多选，也可以不选。确认后保存到草稿；取消不会改变已有偏好。"
        />
      </p>
      <div className={styles.selectionModalGrid}>
        {DETAIL_OPTIONS[interest].map((option) => (
          <label className={styles.toggleField} key={option}>
            <input
              checked={selection.includes(option)}
              onChange={() => toggle(option)}
              type="checkbox"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <div className={styles.modalActions}>
        <Button onClick={() => setSelection([])} variant="ghost">
          清除
        </Button>
        <Button onClick={onClose} variant="secondary">
          取消
        </Button>
        <Button
          onClick={() => {
            onConfirm(selection);
            onClose();
          }}
        >
          确认
        </Button>
      </div>
    </Modal>
  );
}
