"use client";

import { ModuleFallback } from "@/components/modules/ModuleFallback";
import { isModuleEnabled } from "@/lib/feature-modules";
import { useEnabledModules } from "@/hooks/useEnabledModules";

export default function RecipesPage() {
  const { modules } = useEnabledModules();
  if (!isModuleEnabled(modules, "recipes")) {
    return (
      <ModuleFallback
        title="Recipes unavailable"
        description="This module is not enabled for your business type."
      />
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-50">Recipes</h1>
      <p className="text-sm text-zinc-500">
        Café recipe / BOM builder — link items as components and track yields (extend with metadata on
        items).
      </p>
    </div>
  );
}
