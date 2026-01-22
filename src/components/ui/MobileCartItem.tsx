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

export default function MobileCartItem({
    item,
    onIncrease,
    onDecrease,
    onRemove,
    onSave,
    lineTotal,
    formatCurrency,
}: Props) {
    return (
        <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex gap-3">
                <Image
                    src={item.imagePath ?? "/placeholder.png"}
                    alt={item.productPublicName}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover"
                />

                <div className="flex-1">
                    <p className="text-sm font-medium truncate">
                        {item.productPublicName}
                    </p>
                    <p className="text-xs text-gray-500">
                        SKU: {item.productNumber ?? "—"}
                    </p>

                    <p className="mt-2 font-semibold text-emerald-700">
                        {formatCurrency(
                            item.price?.discountedPrice ?? item.price?.actualPrice
                        )}
                    </p>
                </div>

                <button onClick={onRemove} className="text-gray-400">
                    <Trash size={18} />
                </button>
            </div>

            <div className="border-t my-3" />

            <div className="flex justify-between items-center">
                <div className="flex items-center border rounded-lg">
                    <button onClick={onDecrease} className="px-3 py-2">
                        <Minus size={14} />
                    </button>
                    <span className="px-3 font-medium">{item.quantity}</span>
                    <button onClick={onIncrease} className="px-3 py-2">
                        <Plus size={14} />
                    </button>
                </div>

                <div className="text-right">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-semibold">
                        {formatCurrency(lineTotal)}
                    </p>
                </div>
            </div>

            <div className="mt-3 flex justify-between text-sm">
                <button onClick={onSave} className="text-slate-600">
                    Save for later
                </button>
                <button onClick={onRemove} className="text-red-500">
                    Remove
                </button>
            </div>
        </div>
    );
}