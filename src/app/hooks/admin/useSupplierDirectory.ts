import { useMemo } from "react";
import { MATERIAL_SUPPLIER_LINKS, SUPPLIERS } from "@/data/supplier-directory";

export function useSupplierDirectory() {
  const suppliers = useMemo(() => SUPPLIERS, []);
  const links = useMemo(() => MATERIAL_SUPPLIER_LINKS, []);

  return {
    suppliers,
    links,
    getSupplier: (supplierId: string) => suppliers[supplierId] ?? null,
      getLinksForMaterial: (materialId: string) =>
        links.filter((link: any) => link.materialId === materialId),
    getLinksForSupplier: (supplierId: string) =>
        links.filter((link: any) => link.supplierId === supplierId),
  };
}
