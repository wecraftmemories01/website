import RegisterPage from "@/components/RegisterClient";

export const metadata = {
    title: "Create Account | Join WeCraftMemories",
    description:
        "Create your WeCraftMemories account to shop handmade crochet gifts, track orders, save addresses, and enjoy a faster checkout experience.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function Page() {
    return <RegisterPage />;
}