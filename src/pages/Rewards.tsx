import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useRewardsStore } from '@/features/rewards/useRewardsStore';
import { useNotesStore } from '@/features/notes/useNotesStore';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import { bookmarksService } from '@/services/bookmarks';
import { sandboxService } from '@/services/sandbox';
import { db as fbDb } from '@/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/types/auth';
import type { RewardItem } from '@/types/database';
import { 
  Award, AlertCircle, Loader2, ArrowUpRight, Trophy, BookOpen, 
  Bookmark, Star 
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';

export const Rewards: React.FC = () => {
  useDocumentMetadata('Rewards Shop & Leaderboards', 'Redeem study guides, cheat sheets, and monitor your rank on the ClassNotes leaderboard.');
  const { user, updatePoints } = useAuthStore();
  const { items, fetchItems, claimReward, isLoading: isClaiming } = useRewardsStore();
  const { notes, fetchNotes } = useNotesStore();
  const { addNotification } = useNotificationStore();

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesCourse = !item.course || !user?.course || user.role !== 'student' || item.course === user.course;
      const matchesSemester = !item.semester || !user?.semester || user.role !== 'student' || item.semester === user.semester;
      return matchesCourse && matchesSemester;
    });
  }, [items, user]);

  // Component local states
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [userNotesCount, setUserNotesCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const loadStatsAndLeaderboard = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch user bookmarks count
      const bookmarks = await bookmarksService.getBookmarks(user.uid);
      setBookmarksCount(bookmarks.length);

      // 2. Fetch user notes count (where authorId is current user)
      const userNotes = notes.filter(n => n.authorId === user.uid);
      setUserNotesCount(userNotes.length);

      // 3. Load leaderboard
      let usersList: UserProfile[] = [];
      if (sandboxService.isSandboxActive()) {
        const cached = localStorage.getItem('classnotes_seeded_users');
        if (cached) {
          usersList = JSON.parse(cached);
        }
      } else {
        if (fbDb) {
          const snap = await getDocs(collection(fbDb, 'users'));
          usersList = snap.docs.map(d => d.data() as UserProfile);
        }
      }
      // Sort descending by points
      setLeaderboard(usersList.sort((a, b) => b.points - a.points));
    } catch (err) {
      console.error('Failed to load stats/leaderboard:', err);
    }
  }, [user, notes]);

  useEffect(() => {
    fetchItems();
    fetchNotes();
  }, [fetchItems, fetchNotes]);

  useEffect(() => {
    loadStatsAndLeaderboard();
  }, [loadStatsAndLeaderboard]);

  const showToast = (text: string, type: 'error' | 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const generateRewardFileContent = (item: RewardItem): string => {
    switch (item.id) {
      case 'reward-1':
        return `# Advanced React 19 Cheat Sheet\n\n## React Compiler\nReact 19 introduces the React Compiler (React Forget), which automatically memoizes components and hooks. You no longer need to use \`useMemo\` or \`useCallback\` in most cases.\n\n## Server Actions\nServer Actions allow you to run server-side code directly from client-side interactions:\n\`\`\`tsx\nasync function updateProfile(formData: FormData) {\n  'use server';\n  const name = formData.get('name');\n  await db.users.update(name);\n}\n\`\`\`\n\n## New Hooks\n1. **useActionState**: Handles form submission state, pending status, and errors.\n2. **useFormStatus**: Accesses parent form's submission state in nested components.\n3. **useOptimistic**: Renders temporary optimistic state during async transactions.\n4. **use**: Reads promises or context inline during render.\n\n## Dynamic Contexts\nContext can now be used as the provider directly:\n\`\`\`tsx\nconst ThemeContext = createContext('light');\n// React 19 syntax:\n<ThemeContext value="dark">\n  {children}\n</ThemeContext>\n\`\`\`\n`;
      case 'reward-2':
        return `# Data Structures & Algorithms Guide\n\n## Binary Search Tree (BST)\nA BST is a node-based binary tree data structure which has the following properties:\n- The left subtree of a node contains only nodes with keys lesser than the node's key.\n- The right subtree of a node contains only nodes with keys greater than the node's key.\n- The left and right subtree each must also be a binary search tree.\n\n### Complexity:\n- Search: O(log n) average, O(n) worst-case\n- Insertion: O(log n) average, O(n) worst-case\n\n## Graphs & Traversals\n- **BFS (Breadth First Search)**: Uses a queue. Best for finding the shortest path in unweighted graphs.\n- **DFS (Depth First Search)**: Uses a stack or recursion. Best for path finding and topological sorting.\n\n## Sorting Algorithms\n- **Quick Sort**: O(n log n) average, O(n^2) worst case. In-place sorting.\n- **Merge Sort**: O(n log n) stable sorting, requires O(n) extra memory space.\n- **Heap Sort**: O(n log n) in-place comparison-based sorting.\n`;
      case 'reward-3':
        return `# Vite & Rolldown Performance Summary\n\n## What is Rolldown?\nRolldown is a fast, Rust-based bundler specifically designed for Vite. It aims to replace both Esbuild (used in dev/dependency pre-bundling) and Rollup (used for production builds) to bring unified, ultra-fast performance.\n\n## Tree-Shaking Optimization Tips\n1. Use ES Modules (ESM) exclusively.\n2. Mark side effects clearly in \`package.json\` using \`"sideEffects": false\`.\n3. Avoid wildcard imports (\`import * as utils from './utils'\`).\n\n## Bundle Size Diagnostic Tools\n- Use \`rollup-plugin-visualizer\` to analyze bundle distributions.\n- Keep dependency dependencies minimal; prefer native browser APIs where possible.\n`;
      case 'reward-4':
        return `# Chemistry Midterm Mock Exam Paper\n\n## Part A: Multiple Choice Questions\n\n1. Which functional group is characterized by a carbon-oxygen double bond (C=O)?\n   - A) Alcohol\n   - B) Ether\n   - C) Carbonyl (Correct)\n   - D) Alkyl\n\n2. What is the IUPAC name for CH3-CH2-CH(CH3)-CH3?\n   - A) Pentane\n   - B) 2-Methylbutane (Correct)\n   - C) 3-Methylbutane\n   - D) Isobutane\n\n## Part B: Free Response Questions\n\n### Question 1: Carbon Hybridization\nDescribe the hybridization of carbon atoms in ethene (C2H4) compared to ethyne (C2H2).\n*Answer:* In ethene, each carbon is sp2 hybridized, forming a planar shape with 120-degree bond angles. In ethyne, each carbon is sp hybridized, forming a linear shape with 180-degree bond angles.\n`;
      default:
        return `# Study Material: ${item.title}\n\nThank you for redeeming this study material.`;
    }
  };

  const handleClaim = async (item: RewardItem) => {
    if (!user) return;
    if (user.points < item.pointsRequired) {
      showToast('Insufficient points balance to claim this reward.', 'error');
      return;
    }
    if (item.stock <= 0) {
      showToast('This reward is currently out of stock.', 'error');
      return;
    }

    try {
      await claimReward(user.uid, item.id);
      
      // Update points locally
      const remainingPoints = user.points - item.pointsRequired;
      updatePoints(remainingPoints);

      // Trigger actual browser file download
      const content = generateRewardFileContent(item);
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const safeTitle = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      link.download = `${safeTitle}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      // Push notification
      addNotification(
        'Reward Redeemed',
        `Redeemed "${item.title}" for -${item.pointsRequired} points. Check your downloads directory.`,
        'reward'
      );

      showToast(`Successfully claimed "${item.title}"!`, 'success');
      loadStatsAndLeaderboard(); // refresh leaderboard positions
    } catch (err: any) {
      showToast(err.message || 'Failed to claim reward item.', 'error');
    }
  };

  // Compute Achievements dynamically
  const achievements = [
    {
      id: 'ach-1',
      title: 'Knowledge Sharer',
      description: 'Upload your first study document',
      metric: `${userNotesCount}/1`,
      isUnlocked: userNotesCount >= 1,
      icon: BookOpen,
    },
    {
      id: 'ach-2',
      title: 'Expert Educator',
      description: 'Publish 3 or more lecture documents',
      metric: `${userNotesCount}/3`,
      isUnlocked: userNotesCount >= 3,
      icon: Award,
    },
    {
      id: 'ach-3',
      title: 'Active Curator',
      description: 'Add 3 or more study guides to your bookmarks',
      metric: `${bookmarksCount}/3`,
      isUnlocked: bookmarksCount >= 3,
      icon: Bookmark,
    },
    {
      id: 'ach-4',
      title: 'Knowledge Collector',
      description: 'Accumulate 150 points balance',
      metric: `${user?.points || 0}/150`,
      isUnlocked: (user?.points || 0) >= 150,
      icon: Star,
    },
    {
      id: 'ach-5',
      title: 'Campus Master',
      description: 'Earn a balance of 300 points',
      metric: `${user?.points || 0}/300`,
      isUnlocked: (user?.points || 0) >= 300,
      icon: Trophy,
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Toast Alert Popup */}
      <div className="fixed top-20 right-6 z-50 pointer-events-none select-none max-w-sm w-full">
        {toastMessage && (
          <div className={`p-4 rounded-md shadow-lg border flex items-start gap-2.5 bg-surface text-xs font-medium animate-slide-in pointer-events-auto ${
            toastMessage.type === 'error' 
              ? 'border-danger/30 text-danger' 
              : 'border-success/30 text-success'
          }`}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{toastMessage.text}</span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">Store</span>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">Rewards & Shop</h1>
        </div>
      </div>

      {/* Points Summary Header Panel */}
      <div className="luxury-card p-8 bg-primary text-surface relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 select-none">
        <div className="space-y-2 relative z-10 max-w-md">
          <span className="text-[9px] font-mono tracking-widest uppercase text-surface/50">Your balance</span>
          <h2 className="text-3xl font-bold font-mono text-surface leading-none">
            <span className="text-accent">{user?.points ?? 0}</span> <span className="text-xs uppercase font-sans tracking-wide text-surface/80 font-semibold ml-1">pts</span>
          </h2>
          <p className="text-xs text-surface/70 leading-relaxed font-sans mt-2">
            Upload notes to earn points (+50). Deduct 10 points when downloading student documents, or trade points here to redeem premium study guides.
          </p>
        </div>
        <div className="w-16 h-16 rounded-full border border-surface/10 bg-surface/5 flex items-center justify-center relative z-10">
          <Award size={32} className="text-accent" />
        </div>
        {/* Decorative background grid */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-linear-to-r from-transparent to-accent/15 pointer-events-none" />
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Cols: Redeemable shop catalog */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-primary/50 font-bold">Redeemable Study Materials</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((item) => {
              const canAfford = (user?.points ?? 0) >= item.pointsRequired;
              const hasStock = item.stock > 0;
              return (
                <div 
                  key={item.id}
                  className="luxury-card p-6 bg-surface flex flex-col justify-between hover-scale h-full"
                >
                  <div className="space-y-4">
                    {/* Header badge details */}
                    <div className="flex flex-wrap gap-2 justify-between items-center text-[9px] font-mono uppercase tracking-wider">
                      <div className="flex gap-1.5 items-center">
                        <span className="bg-primary/5 border border-border px-2 py-0.5 rounded-sm text-primary/60">
                          {item.type.replace('_', ' ')}
                        </span>
                        {(item.course || item.semester) && (
                          <span className="bg-accent/5 border border-accent/20 px-2 py-0.5 rounded-sm text-accent">
                            {item.course || 'All'} • Sem {item.semester || 'All'}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 border rounded-sm ${
                        hasStock ? 'bg-success/5 text-success border-success/20' : 'bg-danger/5 text-danger border-danger/25'
                      }`}>
                        {hasStock ? `${item.stock} in stock` : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-sm leading-snug tracking-tight text-primary">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-primary/60 leading-relaxed font-sans">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="pt-6 mt-6 border-t border-border/50 flex justify-between items-center gap-4">
                    <div>
                      <span className="text-[9px] font-mono uppercase text-primary/50 block font-semibold">Cost</span>
                      <span className="font-mono font-bold text-accent text-sm">
                        {item.pointsRequired}
                      </span>
                      <span className="text-[9px] text-primary/50 font-mono ml-1 font-medium">pts</span>
                    </div>

                    <button
                      onClick={() => handleClaim(item)}
                      disabled={isClaiming || !canAfford || !hasStock}
                      className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-surface font-semibold py-2 px-3.5 rounded text-[11px] transition-all active-scale disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isClaiming ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ArrowUpRight size={12} className="text-accent" />
                      )}
                      <span>Redeem {item.type === 'mock_exam' ? 'Exam' : item.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Right Col: Achievements & Leaderboard widgets */}
        <div className="space-y-8">
          {/* Achievements Achievements */}
          <div className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-primary/50 font-bold">Achievements & Badges</h2>
            
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="premium-card p-5 space-y-4"
            >
              <div className="space-y-3.5">
                {achievements.map((ach) => {
                  const AchIcon = ach.icon;
                  return (
                    <div 
                      key={ach.id}
                      className={`flex items-center gap-3.5 py-1.5 transition-opacity ${
                        ach.isUnlocked ? 'opacity-100' : 'opacity-35'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-transform hover:scale-110 duration-200 ${
                        ach.isUnlocked 
                          ? 'bg-accent/10 border-accent/25 text-accent shadow-sm' 
                          : 'bg-primary/5 border-border/50 text-primary/45'
                      }`}>
                        {ach.isUnlocked ? <AchIcon size={12} className="fill-accent/10" /> : <AchIcon size={12} />}
                      </div>

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex justify-between items-center gap-2">
                          <h4 className="text-[11px] font-bold text-primary truncate leading-tight tracking-tight">
                            {ach.title}
                          </h4>
                          <span className="text-[9px] font-mono text-accent font-bold shrink-0">{ach.metric}</span>
                        </div>
                        <p className="text-[9.5px] text-primary/50 truncate font-sans leading-none">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Leaderboard Table widget */}
          <div className="space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-primary/50 font-bold">Campus Leaderboard</h2>
            
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="premium-card p-5 space-y-3"
            >
              <div className="flex items-center gap-2 border-b border-border/40 pb-2 text-[9.5px] font-mono uppercase text-primary/45 font-bold tracking-wider">
                <Trophy size={12} className="text-warning animate-float-1" />
                <span>Top Students ranking</span>
              </div>

              <div className="divide-y divide-border/60 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {leaderboard.slice(0, 5).map((u, index) => {
                  const isCurrentUser = u.uid === user?.uid;
                  return (
                    <div 
                      key={u.uid}
                      className={`flex justify-between items-center py-2.5 text-xs transition-colors rounded px-1.5 ${
                        isCurrentUser ? 'bg-accent/[0.03] border-l-2 border-accent' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-4 text-center font-mono font-bold text-[10px] ${
                          index === 0 ? 'text-warning font-black text-xs' :
                          index === 1 ? 'text-primary/60' :
                          'text-primary/40'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </span>
                        <span className={`font-bold truncate ${isCurrentUser ? 'text-accent' : 'text-primary'}`}>
                          {u.displayName}
                        </span>
                      </div>

                      <span className="font-mono text-[10px] font-bold text-primary/60">
                        {u.points} <span className="text-[8px] text-primary/35 font-medium uppercase">pts</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
