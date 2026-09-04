import { ButtonLink } from "@/components/ui/button";

export function HeroStartButton() {
  return (
    <ButtonLink aria-describedby="start-flow-note" href="/start" size="large">
      <span>让我们开始吧</span>
      <span aria-hidden="true">→</span>
    </ButtonLink>
  );
}
