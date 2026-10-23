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
export default function MobileCartItem({
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
            className={`site-card p-3 sm:p-4 ${outOfStock ? "bg-slate-100 border-slate-200" : ""}`}
        >
            <div className="flex items-start gap-3">
                <div className="h-21 w-21 shrink-0 rounded-xl bg-[#ecf8f9] overflow-hidden">
                    <Image
                        src={imageSrc}
                        onError={() => setImageError(true)}
                        alt={item.productPublicName || "Product"}
                        width={84}
                        height={84}
                        className={`w-full h-full object-cover ${outOfStock ? "grayscale opacity-60" : ""}`}
                    />
                </div>
                <div className="min-w-0 grow">
                    <h3
                        className={`text-sm font-bold leading-5 ${outOfStock ? "text-slate-500" : "text-[#173b4a]"}`}
                    >
                        {item.productPublicName}
                    </h3>
                    {outOfStock && (
                        <span className="mt-1 inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Out of stock · Excluded from checkout
                        </span>
                    )}
                    <p className="mt-1 font-semibold text-[#065975]">
                        {formatCurrency(
                            item.price?.discountedPrice ??
                                item.price?.actualPrice ??
                                0,
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={disabled || outOfStock}
                        className="text-xs text-slate-500 underline mt-2 disabled:opacity-50"
                    >
                        Save for later
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${item.productPublicName}`}
                    disabled={removeDisabled}
                    className="site-icon-button !min-w-9 !min-h-9 text-rose-600"
                >
                    <Trash2 size={18} />
                </button>
            </div>
            <div className="flex justify-between items-center gap-2 border-t border-slate-100 mt-3 pt-3">
                <div className="inline-flex items-center border border-[#dae6dc] rounded-xl overflow-hidden">
                    <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={onDecrease}
                        disabled={
                            disabled || outOfStock || Number(item.quantity) <= 1
                        }
                        className="site-icon-button !min-w-9 !min-h-9 disabled:opacity-40"
                    >
                        <Minus size={15} />
                    </button>
                    <span
                        className="w-8 text-sm font-bold text-center"
                        aria-live="polite"
                    >
                        {item.quantity}
                    </span>
                    <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={onIncrease}
                        disabled={disabled || outOfStock}
                        className="site-icon-button !min-w-9 !min-h-9 disabled:opacity-40"
                    >
                        <Plus size={15} />
                    </button>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400">Subtotal</p>
                    <p
                        className={`font-bold text-sm ${outOfStock ? "text-slate-400 line-through" : "text-[#173b4a]"}`}
                    >
                        {outOfStock
                            ? "Not included"
                            : formatCurrency(lineTotal)}
                    </p>
                </div>
            </div>
        </div>
    );
}