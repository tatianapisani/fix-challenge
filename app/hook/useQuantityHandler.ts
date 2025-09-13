import { useEffect, useState } from "react";
import { Product } from "@/app/types/product-types";
import { useCart } from "@/app/context/cart/CartContext";

interface UseQuantityHandlerProps {
    product: Product;
    value: number;
    onQuantityChange: (quantity: number) => void;
    context?: "cart" | "productDetails";
}

/**
 * Convenciones:
 * - unitsPerPallet: unidades por pallet (>=1).
 * - maxQuantity:
 *    - "group" / "unit": máximo en UNIDADES = stock * unitsPerPallet
 *    - "area": máximo en "cajas" = stock (si tu dominio usa cajas)
 * - updateQuantityHandler(newUnits): recibe UNIDADES y sincroniza todo.
 * - En carrito ("group"): se guarda PALLETS (no unidades).
 */
export const useQuantityHandler = ({
    product,
    value,
    onQuantityChange,
    context = "productDetails",
}: UseQuantityHandlerProps) => {
    const unitsPerPallet = product.unitValue && product.unitValue > 0 ? product.unitValue : 1;

    const maxQuantity =
        product.salesUnit === "area"
            ? product.stock // para "area" solemos pensar en cajas disponibles
            : product.stock * unitsPerPallet; // para "group"/"unit": máximo en UNIDADES

    const { cart, updateQuantity } = useCart();
    const cartItem = cart.items.find((i) => i.product.id === product.id);
    const currentQuantity = cartItem ? cartItem.quantity : 0;

    // Estados visibles en UI
    const [quantity, setQuantity] = useState<number>(currentQuantity); // para mostrar en UI (si aplica)
    const [areaInput, setAreaInput] = useState<string>("");
    const [groupInput, setGroupInput] = useState<string>(
        (Math.floor(currentQuantity / unitsPerPallet) || 0).toString()
    );
    const [unitsInput, setUnitsInput] = useState<string>(currentQuantity.toString());

    // Sincroniza cuando viene cantidad desde afuera (p.ej. carrito)
    useEffect(() => {
        if (value === 0 && currentQuantity !== quantity) {
            setQuantity(currentQuantity);
            setUnitsInput(currentQuantity.toString());
            setGroupInput((Math.floor(currentQuantity / unitsPerPallet) || 0).toString());
        }
    }, [value, currentQuantity, quantity, unitsPerPallet]);

    // ---------- Core: una sola fuente de verdad para ajustar y sincronizar ----------
    const updateQuantityHandler = (newUnitsRaw: number) => {
        // clamp a rango válido de UNIDADES
        const newUnits = Math.max(0, Math.min(newUnitsRaw, maxQuantity));

        // pallets derivados
        const pallets = Math.floor(newUnits / unitsPerPallet);

        // reflejar en UI
        setUnitsInput(String(newUnits));
        setGroupInput(String(pallets));
        setQuantity(newUnits);

        // Qué guardamos externamente:
        // - "group": guardar PALLETS
        // - "unit": guardar UNIDADES
        // - "area": depende de tu dominio (aquí no se usa updateQuantityHandler para area)
        const finalForCart =
            product.salesUnit === "group" ? pallets : newUnits;

        if (finalForCart > 0) {
            onQuantityChange(finalForCart);
            updateQuantity(product.id, finalForCart);
        }
    };

    // ---------------- onChange: solo reflejan lo que el usuario escribe ----------------
    const handleUnitsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = parseInt(e.target.value, 10);
        setUnitsInput(Number.isFinite(n) && n >= 0 ? String(n) : "0");

        // si querés feedback inmediato en pallets mientras escribe:
        const live = Number.isFinite(n) && n >= 0 ? Math.floor(n / unitsPerPallet) : 0;
        setGroupInput(String(live));
    };

    const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const p = parseInt(e.target.value, 10);
        const pallets = Number.isFinite(p) && p >= 0 ? p : 0;
        setGroupInput(String(pallets));
        setUnitsInput(String(pallets * unitsPerPallet));
    };

    const handleAreaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAreaInput(e.target.value); // se valida en blur
    };

    // ---------------- onBlur: validan y sincronizan usando updateQuantityHandler ----------------
    const handleUnitsBlur = () => {
        const val = parseInt(unitsInput, 10) || 0;
        updateQuantityHandler(val);
    };

    const handleGroupBlur = () => {
        const pallets = parseInt(groupInput, 10) || 0;
        const units = pallets * unitsPerPallet;
        updateQuantityHandler(units);
    };

    const handleAreaBlur = () => {
        // Normaliza decimales y convierte a "cajas"/unidades según tu dominio.
        // Suponemos areaPerBox (m² por caja). Si no existe, usamos 1 para evitar NaN.
        const areaPerBox = product.areaPerBox && product.areaPerBox > 0 ? product.areaPerBox : 1;
        const raw = areaInput.replace(",", ".");
        const area = Math.max(0, Number.parseFloat(raw) || 0);

        const normalizedArea = Math.round(area * 100) / 100;
        setAreaInput(String(normalizedArea));

        // Convertir área -> cajas (ceil). Clampear a stock.
        const boxes = Math.min(Math.ceil(normalizedArea / areaPerBox), Math.max(0, product.stock || 0));

        // Si tu carrito para "area" guarda cajas, notificá con boxes:
        if (boxes > 0) {
            onQuantityChange(boxes);
            updateQuantity(product.id, boxes);
            setQuantity(boxes);
        } else {
            setQuantity(0);
        }
    };

    // ---------------- botones +/- ----------------
    const handleIncrement = () => {
        if (context === "cart") {
            updateQuantityHandler(quantity + 1);
        } else {
            const step = product.salesUnit === "group" ? unitsPerPallet : 1;
            updateQuantityHandler(quantity + step);
        }
    };

    const handleDecrement = () => {
        if (context === "cart") {
            updateQuantityHandler(Math.max(1, quantity - 1));
        } else {
            const step = product.salesUnit === "group" ? unitsPerPallet : 1;
            updateQuantityHandler(Math.max(1, quantity - step));
        }
    };

    return {
        // state
        quantity,
        areaInput,
        groupInput,
        unitsInput,

        // change
        handleAreaInputChange,
        handleGroupInputChange,
        handleUnitsInputChange,

        // blur (validación)
        handleAreaBlur,
        handleGroupBlur,
        handleUnitsBlur,

        // +/- 
        handleIncrement,
        handleDecrement,
    };
};
