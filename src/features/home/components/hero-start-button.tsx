import { Button } from "@/components/ui/button";

export function HeroStartButton() {
  return (
    <Button
      aria-describedby="start-flow-note"
      size="large"
      title="首次需求流程将在后续任务中接入"
    >
      <span>让我们开始吧</span>
      <span aria-hidden="true">→</span>
    </Button>
  );
}
