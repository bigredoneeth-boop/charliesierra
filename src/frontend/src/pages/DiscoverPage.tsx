import type { PublicGroupSummary } from "@/backend";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicGroups, useSubmitJoinRequest } from "@/hooks/use-discovery";
import { Compass, Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  "All",
  "Operations",
  "Intelligence",
  "Logistics",
  "Training",
  "General",
];

function GroupCard({ group }: { group: PublicGroupSummary }) {
  const submit = useSubmitJoinRequest();

  function handleRequest() {
    submit.mutate(
      { conversationId: group.id, message: undefined },
      {
        onSuccess: () =>
          toast.success(`Join request sent to "${group.name}"`, {
            duration: 4000,
          }),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Request failed"),
      },
    );
  }

  return (
    <Card className="flex flex-col border-border bg-card hover:shadow-elevated transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {group.name}
            </h3>
            {group.category && (
              <Badge
                variant="secondary"
                className="mt-1 text-[10px] uppercase tracking-wide"
              >
                {group.category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Users size={12} aria-hidden="true" />
            <span>{group.memberCount.toString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {group.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {group.description}
          </p>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={handleRequest}
          disabled={submit.isPending}
          data-ocid="discover.request_join_button"
          aria-label={`Request to join ${group.name}`}
        >
          {submit.isPending ? "Sending…" : "Request to Join"}
        </Button>
      </CardContent>
    </Card>
  );
}

function GroupCardSkeleton() {
  return (
    <div className="border border-border rounded-md p-4 space-y-3 bg-card">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-8 w-full mt-2" />
    </div>
  );
}

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [offset, setOffset] = useState(0n);

  const category = activeCategory === "All" ? undefined : activeCategory;
  const { data: groups, isLoading } = usePublicGroups(category, offset);

  const filtered = (groups ?? []).filter((g) =>
    search.trim() === ""
      ? true
      : g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Layout
      title="Discover Groups"
      showEncryptedBadge={false}
      headerRight={
        <Compass
          size={16}
          className="text-muted-foreground"
          aria-hidden="true"
        />
      }
    >
      <div
        className="max-w-4xl mx-auto px-4 py-6 space-y-6"
        data-ocid="discover.page"
      >
        {/* Search + filter header */}
        <section aria-label="Group search and filters">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search groups…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                aria-label="Search public groups"
                data-ocid="discover.search_input"
              />
            </div>
          </div>

          {/* Category filter tabs */}
          <div
            role="tablist"
            aria-label="Filter groups by category"
            className="flex flex-wrap gap-1.5"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setOffset(0n);
                }}
                data-ocid={`discover.filter.${cat.toLowerCase()}`}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Results grid */}
        <section aria-label="Public groups">
          {isLoading ? (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              data-ocid="discover.loading_state"
              aria-busy="true"
              aria-label="Loading groups"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
                <GroupCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="discover.empty_state"
            >
              <Compass
                size={40}
                className="text-muted-foreground mb-4"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-foreground">
                No groups found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search
                  ? "Try a different search term or clear the filter."
                  : "No discoverable groups are available yet."}
              </p>
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((group) => (
                <GroupCard key={group.id.toString()} group={group} />
              ))}
            </div>
          )}
        </section>

        {/* Pagination */}
        {!isLoading && filtered.length > 0 && (
          <div
            className="flex items-center justify-between pt-2"
            aria-label="Pagination"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => (o > 20n ? o - 20n : 0n))}
              disabled={offset === 0n}
              data-ocid="discover.pagination_prev"
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {filtered.length} group{filtered.length !== 1 ? "s" : ""}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => o + 20n)}
              disabled={(groups ?? []).length < 20}
              data-ocid="discover.pagination_next"
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
