import { createActor } from "@/backend";
import type {
  CompartmentLabel,
  DataResidency,
  SovereignConfig,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ── Deployment Info ───────────────────────────────────────────────────────────

export function useDeploymentInfo() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<SovereignConfig>({
    queryKey: ["deployment-info"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getDeploymentInfo();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// ── Set Sovereign Config ──────────────────────────────────────────────────────

export interface SetSovereignConfigArgs {
  residency: DataResidency;
  subnet?: string; // principal text — optional
  nodeCount?: number;
  costMult?: number;
}

export function useSetSovereignConfig() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: SetSovereignConfigArgs,
    ): Promise<SovereignConfig> => {
      if (!actor) throw new Error("Actor not ready");
      // Candid optional args: [] = none, [value] = some
      // DataResidency must be sent as a Candid variant: { eu: null }, etc.
      const residencyVariant = { [args.residency]: null } as Record<
        string,
        null
      >;
      const subnetOpt = args.subnet ? [args.subnet] : [];
      const nodeCountOpt =
        args.nodeCount !== undefined ? [BigInt(args.nodeCount)] : [];
      const costMultOpt = args.costMult !== undefined ? [args.costMult] : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).setSovereignConfig(
        residencyVariant,
        subnetOpt,
        nodeCountOpt,
        costMultOpt,
      );
      if (result?.__kind__ === "err") throw new Error(String(result.err));
      return result.ok as SovereignConfig;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["deployment-info"] });
      void qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

// ── Group Compartment ─────────────────────────────────────────────────────────

export function useGroupCompartment(convId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<CompartmentLabel | null>({
    queryKey: ["group-compartment", convId?.toString()],
    queryFn: async () => {
      if (!actor || convId === null) return null;
      const result = await actor.getGroupCompartment(convId);
      return result ?? null;
    },
    enabled: !!actor && !isFetching && convId !== null,
    staleTime: 30_000,
  });
}

export interface SetGroupCompartmentArgs {
  convId: bigint;
  compartment: CompartmentLabel;
}

export function useSetGroupCompartment() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: SetGroupCompartmentArgs): Promise<void> => {
      if (!actor) throw new Error("Actor not ready");
      // CompartmentLabel must be sent as a Candid variant: { classified: null }
      const compartmentVariant = { [args.compartment]: null } as Record<
        string,
        null
      >;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).setGroupCompartment(
        args.convId,
        compartmentVariant,
      );
      if (result?.__kind__ === "err") throw new Error(String(result.err));
    },
    onSuccess: (_data, args) => {
      void qc.invalidateQueries({
        queryKey: ["group-compartment", args.convId.toString()],
      });
      void qc.invalidateQueries({ queryKey: ["group-compartments"] });
      void qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

// ── Export Config Bundle ──────────────────────────────────────────────────────

export function useExportConfigBundle() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!actor) throw new Error("Actor not ready");
      const result = await actor.exportConfigBundle();
      if (result.__kind__ === "err") throw new Error(String(result.err));
      const bundle = result.ok;
      const json = JSON.stringify(
        bundle,
        // Handle BigInt serialization
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        2,
      );
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `charlesierra-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Config bundle exported — encryption keys not included");
    },
  });
}
