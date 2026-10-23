import Image from "next/image";
import { useState } from "react";
import { publicImageUrl } from "@/lib/publicImageUrl";
import { Minus, Plus, Trash2 } from "lucide-react";

type Props = {
    item: any;
    disabled?: boolean;
    outOfStock?: boolean;
    removeDisabled?: boolean;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
    onSave: () => void;
    lineTotal: number;
    formatCurrency: (v: number) => string;
};
export default function DesktopCartItem({
    item,
    disabled,
    outOfStock = false,
    removeDisabled = false,
    onIncrease,
    onDecrease,
    onRemove,
    onSave,
    lineTotal,
    formatCurrency,
}: Props) {
    const [imageError, setImageError] = useState(false);
    const imageSrc =
        (imageError ? null : publicImageUrl(item.imagePath)) ||
        "/no-image-placeholder.png";
    return (
        <div
            className={`flex flex-wrap gap-4 px-3 sm:px-5 py-5 items-start border-b border-[#e7ece7] last:border-b-0 ${outOfStock ? "bg-slate-100" : ""}`}
        >
            <div className="w-20 h-20 shrink-0 bg-[#ecf8f9] rounded-2xl overflow-hidden">
                <Image
                    src={imageSrc}
                    onError={() => setImageError(true)}
                    alt={item.productPublicName || "Product"}
                    width={80}
                    height={80}
                    className={`w-full h-full object-cover ${outOfStock ? "grayscale opacity-60" : ""}`}
                />
            </div>
            <div className="flex-1 min-w-[130px]">
                <h3
                    className={`text-sm font-bold leading-6 ${outOfStock ? "text-slate-500" : "text-[#173b4a]"}`}
                >
                    {item.productPublicName}
                </h3>
                {outOfStock && (
                    <span className="mt-1 inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Out of stock · Excluded from checkout
                    </span>
                )}
                <p className="text-sm text-[#065975] mt-1 font-semibold">
                    {formatCurrency(
                        item.price?.discountedPrice ??
                            item.price?.actualPrice ??
                            0,
                    )}{" "}
                    each
                </p>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={disabled || outOfStock}
                    className="text-xs text-slate-500 hover:text-[#065975] hover:underline mt-2 disabled:opacity-50"
                >
                    Save for later
                </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 ml-auto">
                <div className="flex items-center border border-[#dae6dc] rounded-xl overflow-hidden">
                    <button
                        type="button"
                        aria-label={`Decrease ${item.productPublicName} quantity`}
                        onClick={onDecrease}
                        disabled={
                            disabled || outOfStock || Number(item.quantity) <= 1
                        }
                        className="site-icon-button !w-9 !h-9 !min-h-9 !min-w-9 disabled:opacity-40"
                    >
                        <Minus size={16} />
                    </button>
                    <span
                        className="w-8 text-sm font-semibold text-center"
                        aria-live="polite"
                    >
                        {item.quantity}
                    </span>
                    <button
                        type="button"
                        aria-label={`Increase ${item.productPublicName} quantity`}
                        onClick={onIncrease}
                        disabled={disabled || outOfStock}
                        className="site-icon-button !w-9 !h-9 !min-h-9 !min-w-9 disabled:opacity-40"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <strong
                    className={`min-w-20 text-right text-sm ${outOfStock ? "text-slate-400" : "text-[#173b4a]"}`}
                >
                    {outOfStock ? "Excluded" : formatCurrency(lineTotal)}
                </strong>
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={removeDisabled}
                    aria-label={`Remove ${item.productPublicName}`}
                    className="site-icon-button text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                    title="Remove"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}