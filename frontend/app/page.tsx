"use client";

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth } from "./layout";

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <ul>
      {todos?.map((todo) => (
        <li>{todo}</li>
      ))}
    </ul>
  )
}

// export default function Home() {
//   const { session, loading } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!loading) {
//       router.replace(session ? "/documents" : "/login");
//     }
//   }, [session, loading, router]);

//   return (
//     <div className="flex items-center justify-center min-h-screen">
//       <p className="text-gray-400">Loading...</p>
//     </div>
//   );
// }
