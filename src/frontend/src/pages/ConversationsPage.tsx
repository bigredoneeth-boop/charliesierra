import { ConversationListItem } from "@/components/ConversationListItem";
import { EmptyState } from "@/components/EmptyState";
import { Layout } from "@/components/Layout";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversations } from "@/hooks/use-conversations";
import { useParams } from "@tanstack/react-router";
import { Lock, MessageSquare, PenSquare } from "lucide-react";
import { useState } from "react";

const SKELETON_IDS = ["a", "b", "c", "d", "e"] as const;

export default function ConversationsPage() {
  const { data: conversations, isLoading } = useConversations();

  const [dialogOpen, setDialogOpen] = useState(false);

  // Determine active conversation from route param if present
  const params = useParams({ strict: false }) as { id?: string };
  const activeId = params?.id ?? null;

  return (
    <Layout
      title="Messages"
      showEncryptedBadge
      headerRight={
        <button
          type="button"
          aria-label="New conversation"
          data-ocid="conversations.new_button"
          onClick={() => setDialogOpen(true)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
        >
          <PenSquare size={16} />
        </button>
      }
    >
      <div className="flex h-full">
        {/* Conversation list */}
        <div className="w-full md:w-80 border-r border-border flex flex-col flex-shrink-0 bg-card">
          {/* List header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Conversations
            </h2>
            <span className="text-xs text-muted-foreground">
              {conversations?.length ?? 0}
            </span>
          </div>

          <div
            className="flex-1 overflow-y-auto"
            data-ocid="conversations.list"
          >
            {isLoading ? (
              <div className="p-4 space-y-3">
                {SKELETON_IDS.map((sid) => (
                  <div key={sid} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Start a secure encrypted conversation with any Internet Identity user."
                action={{
                  label: "Start a new chat",
                  onClick: () => setDialogOpen(true),
                  ocid: "conversations.empty_state_button",
                }}
                ocid="conversations.empty_state"
              />
            ) : (
              conversations.map((conv, idx) => (
                <ConversationListItem
                  key={conv.id.toString()}
                  conversation={conv}
                  isActive={activeId === conv.id.toString()}
                  index={idx + 1}
                />
              ))
            )}
          </div>
        </div>

        {/* Main chat area — shown on desktop when no conversation is selected */}
        <div className="hidden md:flex flex-1 items-center justify-center bg-background">
          {activeId ? null : (
            <div className="flex flex-col items-center gap-5 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lock size={24} className="text-primary" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h3 className="text-sm font-semibold text-foreground">
                  End-to-end encrypted
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Select a conversation to start messaging. All messages are
                  encrypted on your device before being sent.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                data-ocid="conversations.desktop_new_button"
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
              >
                <PenSquare size={14} />
                New Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Layout>
  );
}
