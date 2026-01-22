import Image from "next/image";
import { Minus, Plus, Trash } from "lucide-react";

type Props = {
    item: any;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
    onSave: () => void;
    lineTotal: number;
    formatCurrency: (v: number) => string;
};

export default function DesktopCartItem({
    item,
    onIncrease,
    onDecrease,
    onRemove,
    onSave,
    lineTotal,
    formatCurrency,
}: Props) {
    return (
        <div className="grid grid-cols-[80px_1fr_120px_160px_120px_60px] items-center px-4 py-4 border-t border-gray-200">
            {/* Image */}
            <Image
                src={item.imagePath ?? "/placeholder-80x80.png"}
                alt={item.productPublicName}
                width={64}
                height={64}
                className="rounded-md object-cover"
            />

            {/* Product */}
            <div className="min-w-0">
                <p className="font-medium truncate">
                    {item.productPublicName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    SKU: {item.productNumber ?? "—"}
                </p>
                <button
                    onClick={onSave}
                    className="text-xs text-slate-600 mt-1 hover:underline"
                >
                    Save for later
                </button>
            </div>

            {/* Price */}
            <div className="text-center font-medium">
                {formatCurrency(
                    item.price?.discountedPrice ?? item.price?.actualPrice
                )}
            </div>

            {/* Quantity */}
            <div className="flex justify-center">
                <div className="flex items-center border rounded-md">
                    <button onClick={onDecrease} className="px-2 py-1">
                        <Minus size={14} />
                    </button>
                    <span className="px-3 text-sm font-medium">
                        {item.quantity}
                    </span>
                    <button onClick={onIncrease} className="px-2 py-1">
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Total */}
            <div className="text-center font-semibold">
                {formatCurrency(lineTotal)}
            </div>

            {/* Remove */}
            <div className="flex justify-center">
                <button
                    onClick={onRemove}
                    className="text-gray-400 hover:text-red-600"
                    title="Remove item"
                >
                    <Trash size={18} />
                </button>
            </div>
        </div>
    );
}