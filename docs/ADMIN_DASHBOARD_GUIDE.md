# Admin Dashboard Development Guide

## Overview
This guide will help you build an admin dashboard to view and manage users, their points, VIP status, and referral counts. This is designed for junior developers with basic knowledge of React, Next.js, and Firebase.

---

## Table of Contents
1. [Understanding the Data Structure](#understanding-the-data-structure)
2. [Setting Up the Dashboard Page](#setting-up-the-dashboard-page)
3. [Fetching User Data](#fetching-user-data)
4. [Building the User Table](#building-the-user-table)
5. [Adding Filters and Search](#adding-filters-and-search)
6. [Testing Your Dashboard](#testing-your-dashboard)
7. [Troubleshooting](#troubleshooting)

---

## Understanding the Data Structure

### User Profile Structure (Firestore)
Each user document in the `users` collection has the following structure:

```typescript
interface UserProfile {
  id: string;                    // User ID (document ID)
  name: string;                  // User's full name
  email: string;                 // User's email address
  points: number;                // Referral points earned
  referralCount: number;         // Number of successful referrals
  isVip: boolean;                // VIP status (paid $1 deposit)
  vipPaidAt?: Date;              // When they became VIP
  referralCode: string;          // Their unique referral code
  referredBy?: string;           // Who referred them (referral code)
  createdAt: Date;               // Account creation date
  rewards?: Reward[];            // Rewards they've redeemed
  theme?: 'light' | 'dark';      // UI theme preference
}
```

### Example User Document
```json
{
  "id": "abc123xyz",
  "name": "John Doe",
  "email": "john@example.com",
  "points": 150,
  "referralCount": 5,
  "isVip": true,
  "vipPaidAt": "2026-01-20T10:30:00Z",
  "referralCode": "JOHN123",
  "referredBy": "SARAH456",
  "createdAt": "2026-01-15T08:00:00Z"
}
```

---

## Setting Up the Dashboard Page

### Step 1: Create the Dashboard Route

Create a new file: `src/app/admin/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    
    // TODO: Add admin check here
    // For now, we'll fetch all users
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    // We'll implement this next
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        {/* We'll add the table here */}
      </main>
      <Footer />
    </div>
  );
}
```

---

## Fetching User Data

### Step 2: Implement the `fetchUsers` Function

Add this function inside your component:

```typescript
const fetchUsers = async () => {
  setLoading(true);
  
  try {
    // Create a query to get all users, ordered by points (highest first)
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('points', 'desc'));
    
    // Execute the query
    const querySnapshot = await getDocs(q);
    
    // Transform the data
    const usersData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    setUsers(usersData);
    console.log(`✅ Fetched ${usersData.length} users`);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
  } finally {
    setLoading(false);
  }
};
```

### Understanding the Query

- `collection(db, 'users')` - References the users collection in Firestore
- `orderBy('points', 'desc')` - Sorts users by points in descending order (highest first)
- `getDocs(q)` - Executes the query and returns all matching documents
- `querySnapshot.docs.map()` - Transforms Firestore documents into JavaScript objects

---

## Building the User Table

### Step 3: Create the Table Component

First, install the required UI components (if not already installed):

```bash
pnpm add @radix-ui/react-table
```

Now add the table to your dashboard:

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Crown, Users, TrendingUp } from 'lucide-react';

// Add this inside your return statement, replacing the comment
{loading ? (
  <Card>
    <CardContent className="p-6">
      <Skeleton className="h-8 w-full mb-4" />
      <Skeleton className="h-8 w-full mb-4" />
      <Skeleton className="h-8 w-full mb-4" />
    </CardContent>
  </Card>
) : (
  <>
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{users.length}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">VIP Members</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {users.filter(u => u.isVip).length}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {users.reduce((sum, u) => sum + (u.referralCount || 0), 0)}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Users Table */}
    <Card>
      <CardHeader>
        <CardTitle>All Users</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Points</TableHead>
              <TableHead className="text-center">Referrals</TableHead>
              <TableHead className="text-center">VIP Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{user.points || 0}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {user.referralCount || 0}
                </TableCell>
                <TableCell className="text-center">
                  {user.isVip ? (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">
                      <Crown className="h-3 w-3 mr-1" />
                      VIP
                    </Badge>
                  ) : (
                    <Badge variant="outline">Regular</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </>
)}
```

---

## Adding Filters and Search

### Step 4: Add Search and Filter Functionality

Add state for search and filters:

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [filterVip, setFilterVip] = useState<'all' | 'vip' | 'regular'>('all');
const [sortBy, setSortBy] = useState<'points' | 'referrals' | 'date'>('points');
```

Add filter logic:

```typescript
// Add this before your return statement
const filteredUsers = users.filter(user => {
  // Search filter
  const matchesSearch = 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase());
  
  // VIP filter
  const matchesVip = 
    filterVip === 'all' ? true :
    filterVip === 'vip' ? user.isVip :
    !user.isVip;
  
  return matchesSearch && matchesVip;
});

// Sort filtered users
const sortedUsers = [...filteredUsers].sort((a, b) => {
  switch (sortBy) {
    case 'points':
      return (b.points || 0) - (a.points || 0);
    case 'referrals':
      return (b.referralCount || 0) - (a.referralCount || 0);
    case 'date':
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    default:
      return 0;
  }
});
```

Add the filter UI:

```typescript
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

// Add this before the stats cards
<div className="flex flex-col md:flex-row gap-4 mb-6">
  <Input
    placeholder="Search by name or email..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="md:w-1/3"
  />
  
  <Select value={filterVip} onValueChange={(value: any) => setFilterVip(value)}>
    <SelectTrigger className="md:w-48">
      <SelectValue placeholder="Filter by status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Users</SelectItem>
      <SelectItem value="vip">VIP Only</SelectItem>
      <SelectItem value="regular">Regular Only</SelectItem>
    </SelectContent>
  </Select>
  
  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
    <SelectTrigger className="md:w-48">
      <SelectValue placeholder="Sort by" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="points">Points (High to Low)</SelectItem>
      <SelectItem value="referrals">Referrals (High to Low)</SelectItem>
      <SelectItem value="date">Newest First</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Update the table to use `sortedUsers` instead of `users`:

```typescript
{sortedUsers.map((user) => (
  // ... table row content
))}
```

---

## Testing Your Dashboard

### Step 5: Test the Dashboard

1. **Start your development server:**
   ```bash
   pnpm dev
   ```

2. **Navigate to the admin dashboard:**
   ```
   http://localhost:9008/admin
   ```

3. **Check that you can see:**
   - ✅ Total user count
   - ✅ VIP member count
   - ✅ Total referrals
   - ✅ User table with all data
   - ✅ Search functionality
   - ✅ Filter by VIP status
   - ✅ Sort by points/referrals/date

4. **Test each feature:**
   - Search for a user by name
   - Search for a user by email
   - Filter to show only VIP users
   - Filter to show only regular users
   - Sort by different criteria

---

## Adding Admin Authentication

### Step 6: Secure the Dashboard (Important!)

Right now, anyone can access the admin dashboard. Let's add authentication:

```typescript
// Add this to your Firestore users collection
// Add an `isAdmin` field to specific user documents

// In your component:
useEffect(() => {
  if (!user) {
    router.push('/');
    return;
  }
  
  // Check if user is admin
  if (!profile?.isAdmin) {
    toast.error('Access denied. Admin privileges required.');
    router.push('/');
    return;
  }
  
  fetchUsers();
}, [user, profile]);
```

To make a user an admin, manually update their Firestore document:

```javascript
// In Firebase Console or using Firebase Admin SDK
{
  "isAdmin": true
}
```

---

## Troubleshooting

### Common Issues

**1. "Permission denied" error when fetching users**
- **Cause:** Firestore security rules don't allow reading all users
- **Solution:** Update your Firestore rules:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId} {
        // Allow admins to read all users
        allow read: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
        // Allow users to read their own data
        allow read: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```

**2. Users not showing up**
- **Check:** Console for errors
- **Check:** Firebase Console to see if users exist
- **Check:** Network tab to see if query is executing

**3. Dates showing as "N/A"**
- **Cause:** Firestore timestamps need conversion
- **Solution:** Already handled in the code above with `user.createdAt.seconds * 1000`

**4. Search not working**
- **Check:** `searchTerm` state is updating
- **Check:** Filter logic is correct (case-insensitive)
- **Debug:** Add `console.log(filteredUsers)` to see results

---

## Next Steps

### Enhancements You Can Add

1. **Export to CSV**
   ```typescript
   const exportToCSV = () => {
     const csv = [
       ['Name', 'Email', 'Points', 'Referrals', 'VIP Status'],
       ...sortedUsers.map(u => [
         u.name,
         u.email,
         u.points || 0,
         u.referralCount || 0,
         u.isVip ? 'VIP' : 'Regular'
       ])
     ].map(row => row.join(',')).join('\n');
     
     const blob = new Blob([csv], { type: 'text/csv' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'users-export.csv';
     a.click();
   };
   ```

2. **Pagination**
   - Use Firestore's `startAfter()` and `limit()` for large datasets
   - Add "Next" and "Previous" buttons

3. **User Details Modal**
   - Click on a user row to see full details
   - Show referral history, rewards redeemed, etc.

4. **Real-time Updates**
   - Use `onSnapshot()` instead of `getDocs()` for live data

5. **Charts and Analytics**
   - Add charts using `recharts` or `chart.js`
   - Show user growth over time
   - VIP conversion rate

---

## Complete Code Example

Here's the full `src/app/admin/page.tsx` file:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Crown, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVip, setFilterVip] = useState<'all' | 'vip' | 'regular'>('all');
  const [sortBy, setSortBy] = useState<'points' | 'referrals' | 'date'>('points');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    
    if (!profile?.isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
      return;
    }
    
    fetchUsers();
  }, [user, profile]);

  const fetchUsers = async () => {
    setLoading(true);
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('points', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      console.log(`✅ Fetched ${usersData.length} users`);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVip = 
      filterVip === 'all' ? true :
      filterVip === 'vip' ? user.isVip :
      !user.isVip;
    
    return matchesSearch && matchesVip;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return (b.points || 0) - (a.points || 0);
      case 'referrals':
        return (b.referralCount || 0) - (a.referralCount || 0);
      case 'date':
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full mb-4" />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-1/3"
              />
              
              <Select value={filterVip} onValueChange={(value: any) => setFilterVip(value)}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="vip">VIP Only</SelectItem>
                  <SelectItem value="regular">Regular Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Points (High to Low)</SelectItem>
                  <SelectItem value="referrals">Referrals (High to Low)</SelectItem>
                  <SelectItem value="date">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">VIP Members</CardTitle>
                  <Crown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter(u => u.isVip).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.reduce((sum, u) => sum + (u.referralCount || 0), 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Users ({sortedUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                      <TableHead className="text-center">Referrals</TableHead>
                      <TableHead className="text-center">VIP Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{user.points || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {user.referralCount || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.isVip ? (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600">
                              <Crown className="h-3 w-3 mr-1" />
                              VIP
                            </Badge>
                          ) : (
                            <Badge variant="outline">Regular</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
```

---

## Summary

You now have a complete admin dashboard that shows:
- ✅ Total users, VIP members, and referral counts
- ✅ Searchable user table
- ✅ Filter by VIP status
- ✅ Sort by points, referrals, or join date
- ✅ Admin authentication
- ✅ Responsive design

Good luck with your development! 🚀
