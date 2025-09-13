import React from "react";
import { Product } from "@/app/types/product-types";
import { useQuantityHandler } from "@/app/hook/useQuantityHandler";

interface QuantitySelectorProps {
    product: Product;
    value: number;
    onQuantityChange: (quantity: number) => void;
    context?: "cart" | "productDetails";
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
    product,
    value,
    onQuantityChange,
    context = "productDetails",
}) => {
    const {
        quantity,
        areaInput,
        groupInput,
        unitsInput,
        handleAreaInputChange,
        handleGroupInputChange,
        handleUnitsInputChange,
        handleAreaBlur,
        handleGroupBlur,
        handleUnitsBlur,
        handleIncrement,
        handleDecrement,
    } = useQuantityHandler({ product, value, onQuantityChange, context });

    return (
        <div className="flex flex-col space-y-2">
            {/* Cart: +/- simple */}
            {context === "cart" && (
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-semibold">Cantidad:</label>
                    <button
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                        className="border px-2 rounded hover:bg-gray-100 duration-200"
                    >
                        -
                    </button>
                    <span className="w-5 h-auto text-center">{quantity}</span>
                    <button
                        onClick={handleIncrement}
                        disabled={quantity >= product.stock}
                        className="border px-2 rounded hover:bg-gray-100 duration-200"
                    >
                        +
                    </button>
                </div>
            )}

            {/* Product Details: salesUnit = 'group' (unidades ↔ pallets) */}
            {context === "productDetails" && product.salesUnit === "group" && (
                <>
                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-semibold">Cantidad de unidades:</label>
                        <input
                            type="number"
                            min={0}
                            placeholder="198"
                            value={unitsInput}
                            onChange={handleUnitsInputChange}
                            onBlur={handleUnitsBlur}
                            className="border rounded text-center px-2 py-1 w-24"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-semibold">Cantidad de pallets:</label>
                        <input
                            data-testid="quantity-group-input"
                            type="number"
                            min={0}
                            max={product.stock}
                            step={1}
                            value={groupInput}
                            onChange={handleGroupInputChange}
                            onBlur={handleGroupBlur}
                            className="border rounded text-center px-2 py-1 w-24"
                        />
                    </div>
                </>
            )}

            {/* Product Details: salesUnit = 'area' (área ↔ cajas) */}
            {context === "productDetails" && product.salesUnit === "area" && (
                <>
                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-semibold">Superficie:</label>
                        <input
                            data-testid="quantity-area-input"
                            type="text"
                            step="0.01"
                            min={0}
                            value={areaInput}
                            onChange={handleAreaInputChange}
                            onBlur={handleAreaBlur}
                            placeholder="2.68"
                            className="border rounded px-2 py-1 w-20 h-auto text-center"
                        />
                        <span className="text-sm text-gray-500">m²</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-semibold">Cantidad de cajas:</label>
                        <span className="border rounded px-2 py-1 w-14 h-auto text-center">
                            {quantity}
                        </span>
                    </div>
                </>
            )}

            {/* Product Details: salesUnit = 'unit' (contador simple) */}
            {context === "productDetails" && product.salesUnit === "unit" && (
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-semibold">Cantidad:</label>
                    <button
                        onClick={handleDecrement}
                        disabled={quantity <= 0}
                        className="border px-2 rounded hover:bg-gray-100 duration-200"
                    >
                        -
                    </button>
                    <span data-testid="quantity-unit-value" className="w-5 h-auto text-center">
                        {quantity}
                    </span>
                    <button
                        onClick={handleIncrement}
                        disabled={quantity >= product.stock}
                        className="border px-2 rounded hover:bg-gray-100 duration-200"
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuantitySelector;
