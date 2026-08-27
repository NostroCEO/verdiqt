import { ClosingBand } from "@/components/landing/closing-band";
import { CourtroomCta } from "@/components/landing/courtroom-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { ProceduralRecord } from "@/components/landing/procedural-record";
import { TechnologyStack } from "@/components/landing/technology-stack";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Presentation page: [01] hero, [02] procedural record, [03] courtroom CTA,
// [04] selected stack, [05] closing band. The working dashboard and the
// agent sandbox live on /trial.
export default function Home() {
  return (
    <main className="editorial-shell relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <LandingHero />
      <ProceduralRecord />
      <CourtroomCta />
      <TechnologyStack />
      <ClosingBand />
      <SiteFooter />
    </main>
  );
}
