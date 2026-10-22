import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";

type Props = {
    item: any;
    disabled?: boolean;
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
    onIncrease,
    onDecrease,
    onRemove,
    onSave,
    lineTotal,
    formatCurrency,
}: Props) {
    return (
        <div className="flex flex-wrap gap-4 px-3 sm:px-5 py-5 items-start border-b border-[#e7ece7] last:border-b-0">
            <div className="w-20 h-20 shrink-0 bg-[#ecf8f9] rounded-2xl overflow-hidden">
                <Image
                    src={item.imagePath || "/no-image-placeholder.png"}
                    alt={item.productPublicName || "Product"}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="flex-1 min-w-[130px]">
                <h3 className="text-sm font-bold text-[#173b4a] leading-6">
                    {item.productPublicName}
                </h3>
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
                    disabled={disabled}
                    className="text-xs text-slate-500 hover:text-[#065975] hover:underline mt-2"
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
                        disabled={disabled || Number(item.quantity) <= 1}
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
                        disabled={disabled}
                        className="site-icon-button !w-9 !h-9 !min-h-9 !min-w-9 disabled:opacity-40"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <strong className="min-w-20 text-right text-sm text-[#173b4a]">
                    {formatCurrency(lineTotal)}
                </strong>
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disabled}
                    aria-label={`Remove ${item.productPublicName}`}
                    className="site-icon-button text-rose-600 hover:bg-rose-50"
                    title="Remove"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}