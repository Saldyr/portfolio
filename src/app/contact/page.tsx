import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Contact — Saldyr",
  description: "Une question, une piste de collaboration : écris à Saldyr.",
};

export default function ContactPage() {
  return (
    <>
      <Nav page="contact" />

      <main className="container-page flex flex-col gap-(--gap-section) pt-(--gap-section)">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-(--space-xl) rounded-card border border-(--border-subtle) bg-surface p-(--pad-card)">
          <div className="flex flex-col gap-(--space-m)">
            <SectionHeading>CONTACT</SectionHeading>
            <p className="m-0 max-w-[40ch] text-sm leading-[1.7] text-(--text-muted)">
              Une question, une piste de collaboration : écris-moi, je
              réponds sous 48 h.
            </p>
          </div>
          <ContactForm />
        </section>
      </main>

      <Footer />
    </>
  );
}
