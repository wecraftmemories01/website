import VerifyEmailPage from "@/components/VerifyEmailClient";

export const metadata = {
    title: "Verify Email | Activate Your WeCraftMemories Account",
    description:
        "Verify your email address to activate your WeCraftMemories account and start shopping handmade crochet gifts and handcrafted decor.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function Page() {
    return <VerifyEmailPage />;
}