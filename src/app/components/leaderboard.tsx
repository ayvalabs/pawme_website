'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { getLeaderboard, getUserRank } from '@/app/actions/users';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Trophy, User as UserIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  rank: number;
}

interface LeaderboardProps {
  currentUser: {
    id: string;
    name: string;
    points: number;
  };
  open: boolean;
  onClose: () => void;
}

export function Leaderboard({ currentUser, open, onClose }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      async function fetchData() {
        setLoading(true);
        try {
          const [topUsers, rank] = await Promise.all([
            getLeaderboard(),
            getUserRank(currentUser.id, currentUser.points),
          ]);
          setLeaderboard(topUsers);
          setUserRank(rank);
        } catch (error) {
          console.error("Failed to fetch leaderboard data:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchData();
    }
  }, [open, currentUser.id, currentUser.points]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="text-primary w-6 h-6" />
            Leaderboard
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-center"><Skeleton className="h-5 w-5 rounded-full mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      {leaderboard.map((user, index) => (
                        <TableRow key={user.id} className={user.id === currentUser.id ? 'bg-primary/10' : ''}>
                          <TableCell className="text-center font-bold text-lg">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : user.rank}
                          </TableCell>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-right font-semibold">{user.points}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {userRank && userRank > 10 && !loading && (
             <Card className="mt-6 bg-primary/10 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserIcon className="w-4 h-4"/> Your Rank
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex justify-between items-center">
                     <div>
                       <p className="font-semibold">{currentUser.name}</p>
                       <p className="text-sm text-muted-foreground">{currentUser.points} points</p>
                     </div>
                     <p className="text-2xl font-bold text-primary">#{userRank}</p>
                   </div>
                </CardContent>
             </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
