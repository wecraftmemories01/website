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
export default function MobileCartItem({
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
        <div className="site-card p-3 sm:p-4">
            <div className="flex items-start gap-3">
                <div className="h-21 w-21 shrink-0 rounded-xl bg-[#ecf8f9] overflow-hidden">
                    <Image
                        src={item.imagePath || "/no-image-placeholder.png"}
                        alt={item.productPublicName || "Product"}
                        width={84}
                        height={84}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="min-w-0 grow">
                    <h3 className="text-sm font-bold text-[#173b4a] leading-5">
                        {item.productPublicName}
                    </h3>
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
                        disabled={disabled}
                        className="text-xs text-slate-500 underline mt-2"
                    >
                        Save for later
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${item.productPublicName}`}
                    disabled={disabled}
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
                        disabled={disabled || Number(item.quantity) <= 1}
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
                        disabled={disabled}
                        className="site-icon-button !min-w-9 !min-h-9 disabled:opacity-40"
                    >
                        <Plus size={15} />
                    </button>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400">Subtotal</p>
                    <p className="font-bold text-sm text-[#173b4a]">
                        {formatCurrency(lineTotal)}
                    </p>
                </div>
            </div>
        </div>
    );
}