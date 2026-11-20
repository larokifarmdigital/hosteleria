import { redirect } from 'next/navigation';
import { redirectEditorToOwnRestaurant } from '@/lib/auth/guards';

export default async function RootPage() {
  await redirectEditorToOwnRestaurant();
  redirect('/dashboard');
}
