import Link from "next/link";
import { Gift, HeartHandshake, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";

/** Shared, trustworthy merchandising panel for account screens. No unverified sales claims. */
export default function AuthStoryPanel({ kind }: { kind: "login" | "register" | "reset" }) {
  const content = {
    login: { tag: "GOOD TO SEE YOU AGAIN", title: "Your little corner of handmade joy.", body: "Sign in to manage your account, revisit orders and find your next thoughtful gift." },
    register: { tag: "JOIN OUR CREATIVE COMMUNITY", title: "Good gifts make beautiful memories.", body: "An account makes it easier to keep your delivery details and order history together." },
    reset: { tag: "WE'RE HERE TO HELP", title: "A fresh start, made simple.", body: "Request a password reset through your registered email and get back to exploring handmade gifts." },
  }[kind];
  return (
    <aside className="auth-story hidden md:flex flex-col justify-between" aria-label="About We Craft Memories">
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 text-[11px] tracking-[.18em] font-extrabold text-[#cae5d2]"><Sparkles size={15} /> {content.tag}</span>
        <h2 className="font-extrabold tracking-[-.055em] leading-[1.1] text-white text-4xl lg:text-5xl mt-7">{content.title}</h2>
        <p className="mt-6 text-[15px] leading-7 text-white/80">{content.body}</p>
      </div>
      <div className="relative z-10 space-y-4 mt-14">
        <p className="inline-flex items-center gap-3 text-sm text-white/90"><HeartHandshake size={21} /> Carefully handmade with love</p>
        <p className="inline-flex items-center gap-3 text-sm text-white/90"><PackageCheck size={21} /> Follow your orders in one place</p>
        <p className="inline-flex items-center gap-3 text-sm text-white/90"><ShieldCheck size={21} /> Clear checkout and policies</p>
        <div className="pt-4 border-t border-white/20"><Link href="/hampers" className="inline-flex items-center gap-2 text-sm font-bold text-white hover:underline"><Gift size={17} /> Discover our gift hampers</Link></div>
      </div>
    </aside>
  );
}
