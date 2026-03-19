import data from "./supplier-directory.json";
import type {
  SupplierDirectory,
  MaterialSupplierLinkRegistry,
  MaterialSupplierLink,
} from "../../types/supplier";

export const SUPPLIERS: SupplierDirectory = data.suppliers as unknown as SupplierDirectory;
export const MATERIAL_SUPPLIER_LINKS: MaterialSupplierLinkRegistry = (
  Array.isArray(data.links)
    ? data.links
    : Object.values(data.links ?? {}).flat()
) as MaterialSupplierLink[];
