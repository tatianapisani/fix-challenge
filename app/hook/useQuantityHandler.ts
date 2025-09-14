import { useState, useEffect, useRef } from "react";
import { Product } from "@/app/types/product-types";
import { useCart } from "@/app/context/cart/CartContext";

interface useQuantityHandlerProps {
  product: Product;
  value: number;
  onQuantityChange: (quantity: number) => void;
  context?: "cart" | "productDetails";
}

export const useQuantityHandler = ({
  product,
  value,
  onQuantityChange,
  context,
}: useQuantityHandlerProps) => {
  const unitValue = product.unitValue || 1;

  // En "area": max en cajas = stock. En otros: conservar tu cálculo actual.
  const maxQuantity =
    product.salesUnit === "area"
      ? product.stock
      : Math.floor((product.stock * unitValue) / unitValue) * unitValue;

  const { cart, updateQuantity } = useCart();
  const cartItem = cart.items.find((item) => item.product.id === product.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  const [quantity, setQuantity] = useState<number>(currentQuantity);
  const [areaInput, setAreaInput] = useState<string>("");
  const [groupInput, setGroupInput] = useState<string>(
    (currentQuantity / unitValue).toString()
  );
  const [unitsInput, setUnitsInput] = useState<string>(
    currentQuantity.toString()
  );

  // 👉 Para saber qué campo fue editado por última vez (evitar sobrescribir superficie cuando viene de "Superficie")
  const lastEditedRef = useRef<"area" | "units" | "group" | null>(null);

  // Sincronización inicial
  useEffect(() => {
    if (value === 0 && currentQuantity !== quantity) {
      setQuantity(currentQuantity);
      setUnitsInput(currentQuantity.toString());
      setGroupInput((currentQuantity / unitValue).toString());

      if (product.salesUnit === "area") {
        // En carga inicial mostramos la derivada, está bien
        setAreaInput((currentQuantity * unitValue).toFixed(2));
      }
    }
  }, [value, currentQuantity, quantity, unitValue, product.salesUnit]);

  // Consolida cambios y deriva lo necesario
  const updateQuantityHandler = (newQuantity: number) => {
    const adjustedQuantity = Math.max(0, Math.min(newQuantity, maxQuantity));

    setQuantity(adjustedQuantity);
    setUnitsInput(adjustedQuantity.toString());

    // pallets entero
    const adjustedPallets = Math.floor(adjustedQuantity / unitValue);
    setGroupInput(adjustedPallets.toString());

    // ✅ SOLO si el último edit fue por "units" (cajas), derivamos Superficie.
    // Si el último edit fue por "area", NO sobrescribimos el input del usuario.
    if (product.salesUnit === "area" && lastEditedRef.current === "units") {
      setAreaInput((adjustedQuantity * unitValue).toFixed(2));
    }

    // "group" guarda pallets; "unit"/"area" guarda unidades/cajas
    const finalQuantity =
      product.salesUnit === "group" ? adjustedPallets : adjustedQuantity;

    if (finalQuantity > 0) {
      onQuantityChange(finalQuantity);
      updateQuantity(product.id, finalQuantity);
    }
  };

  // ------- Handlers -------

  // SUPERFICIE: permitir escribir libremente; commit en blur
  const handleAreaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    lastEditedRef.current = "area";
    const raw = (e.target.value ?? "").replace(",", ".");
    setAreaInput(raw);
  };

  const handleAreaBlur = () => {
    const raw = (areaInput ?? "").trim();

    // Permitir borrar
    if (raw === "") {
      // Evitamos sobrescribir a derivada; dejamos 0 en todo
      lastEditedRef.current = "area";
      updateQuantityHandler(0); // NO reescribe superficie porque lastEditedRef = "area"
      return;
    }

    const area = Math.max(0, Number.parseFloat(raw) || 0);
    // 🔁 Política pedida: ENTERO MÁS CERCANO (no ceil)
    const unitsRequired = Math.min(Math.round(area / unitValue), maxQuantity);

    lastEditedRef.current = "area";
    updateQuantityHandler(unitsRequired); // NO reescribe superficie (se mantiene "7" como ingresaste)
  };

  // PALLETS (group)
  const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    lastEditedRef.current = "group";
    const inputPallets = parseInt(e.target.value, 10) || 0;
    const adjustedPallets = Math.min(inputPallets, product.stock);
    const adjustedUnits = adjustedPallets * unitValue;

    setGroupInput(adjustedPallets.toString());
    setUnitsInput(adjustedUnits.toString());

    // Si cambiás pallets en producto 'area', el último edit NO es "units", así que no se tocará areaInput aquí.
    // Eso está bien: en 'group' no queremos escribir superficie.
    updateQuantityHandler(adjustedUnits);
  };

  // UNIDADES/CAJAS
  const handleUnitsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    lastEditedRef.current = "units";
    const inputUnits = parseInt(e.target.value, 10) || 0;
    const adjustedUnits = Math.min(inputUnits, product.stock * unitValue);
    const adjustedPallets = Math.floor(adjustedUnits / unitValue);

    setUnitsInput(adjustedUnits.toString());
    setGroupInput(adjustedPallets.toString());

    updateQuantityHandler(adjustedUnits); // ← al venir de "units", SÍ derivará superficie
  };

  // +/- (igual que antes)
  const handleIncrement = () => {
    lastEditedRef.current = "units";
    let newQuantity = quantity;
    if (context === "cart") {
      newQuantity = Math.min(quantity + 1, maxQuantity);
    } else {
      newQuantity =
        product.salesUnit === "group"
          ? Math.min(quantity + unitValue, maxQuantity)
          : Math.min(quantity + 1, maxQuantity);
    }
    updateQuantityHandler(newQuantity);
  };

  const handleDecrement = () => {
    lastEditedRef.current = "units";
    let newQuantity = quantity;
    if (context === "cart") {
      newQuantity = Math.max(1, quantity - 1);
    } else {
      newQuantity =
        product.salesUnit === "group"
          ? Math.max(1, quantity - unitValue)
          : Math.max(1, quantity - 1);
    }
    updateQuantityHandler(newQuantity);
  };

  return {
    // state
    quantity,
    areaInput,
    groupInput,
    unitsInput,

    // change
    handleAreaInputChange,
    handleAreaBlur,            // <- usalo en el input de Superficie (onBlur)
    handleGroupInputChange,
    handleUnitsInputChange,

    // +/- 
    handleIncrement,
    handleDecrement,
  };
};
