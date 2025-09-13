import { useState, useEffect } from "react";
import { Product } from "@/app/types/product-types";
import { useCart } from "@/app/context/cart/CartContext";

interface useQuantityHandlerProps {
    product: Product;
    value: number;
    onQuantityChange: (quantity: number) => void;
    context?: "cart" | "productDetails";
}

export const useQuantityHandler = ({ product, value, onQuantityChange, context }: useQuantityHandlerProps) => {
    const unitValue = product.unitValue || 1;
    const maxQuantity = product.salesUnit === "area" ? product.stock : Math.floor(product.stock * unitValue / unitValue) * unitValue;

    const { cart } = useCart();
    const cartItem = cart.items.find((item) => item.product.id === product.id);
    const currentQuantity = cartItem ? cartItem.quantity : 0;

    // Re-introducimos el estado local. El problema no era el estado, sino su sincronización.
    const [quantity, setQuantity] = useState<number>(value);
    const [areaInput, setAreaInput] = useState<string>("");
    const [groupInput, setGroupInput] = useState<string>((value / unitValue).toString());
    const [unitsInput, setUnitsInput] = useState<string>(value.toString());

    // Este useEffect es clave: sincroniza el estado local con la única fuente de verdad (el carrito)
    // cada vez que el valor de la prop cambia.
    useEffect(() => {
        setQuantity(value);
        setUnitsInput(value.toString());
        setGroupInput((value / unitValue).toString());
        // El areaInput debe recalcularse en base a la cantidad de unidades
        if (product.salesUnit === "area") {
            const area = value * unitValue;
            setAreaInput(area.toString());
        } else {
            setAreaInput("");
        }
    }, [value, product.salesUnit, unitValue]);

    const updateQuantityHandler = (newQuantity: number) => {
        // Para el contexto del carrito, la cantidad final es la nueva cantidad.
        // Para otros contextos, calculamos la cantidad de pallets si es necesario.
        const finalQuantity = context === "cart"
            ? newQuantity
            : (product.salesUnit === "group" ? Math.floor(newQuantity / unitValue) : newQuantity);

        // Solo actualizamos el carrito si la cantidad es mayor a 0 para no eliminar el producto.
        if (finalQuantity > 0) {
            onQuantityChange(finalQuantity);
        }
    };

    const handleAreaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputArea = e.target.value;
        setAreaInput(inputArea);
        const numericArea = parseFloat(inputArea) || 0;
        const unitsRequired = Math.min(Math.ceil(numericArea / unitValue), maxQuantity);
        updateQuantityHandler(unitsRequired);
    };

    const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputPallets = parseInt(e.target.value, 10) || 0;
        setGroupInput(inputPallets.toString());
        const adjustedPallets = Math.min(inputPallets, product.stock);
        const adjustedUnits = adjustedPallets * unitValue;
        setUnitsInput(adjustedUnits.toString());
        updateQuantityHandler(adjustedPallets);
    };

    const handleUnitsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputUnits = parseInt(e.target.value, 10) || 0;
        setUnitsInput(inputUnits.toString());
        const adjustedUnits = Math.min(inputUnits, product.stock * unitValue);
        const adjustedPallets = Math.floor(adjustedUnits / unitValue);
        setGroupInput(adjustedPallets.toString());
        updateQuantityHandler(adjustedUnits);
    };

    const handleIncrement = () => {
        let newQuantity = quantity;
        if (context === "cart") {
            newQuantity = quantity + 1;
            updateQuantityHandler(newQuantity);
        } else {
            newQuantity = product.salesUnit === "group"
                ? quantity + unitValue
                : quantity + 1;
            updateQuantityHandler(newQuantity);
        }
    };

    const handleDecrement = () => {
        let newQuantity = quantity;
        if (context === "cart") {
            newQuantity = Math.max(1, quantity - 1);
            updateQuantityHandler(newQuantity);
        } else {
            newQuantity = product.salesUnit === "group"
                ? Math.max(1, quantity - unitValue)
                : Math.max(1, quantity - 1);
            updateQuantityHandler(newQuantity);
        }
    };

    return {
        quantity,
        areaInput,
        groupInput,
        unitsInput,
        handleAreaInputChange,
        handleGroupInputChange,
        handleUnitsInputChange,
        handleIncrement,
        handleDecrement,
    };
};
