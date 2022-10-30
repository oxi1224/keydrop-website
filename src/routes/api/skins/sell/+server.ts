import { db, userFromSessionID } from '$lib/server';
import type { Item } from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';
import { nanoid } from 'nanoid';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST(event: RequestEvent) {
  const sessionId = event.cookies.get('session_id');
  const { item }: { item: Item } = await event.request.json();

  if (!sessionId) return new Response(JSON.stringify({ message: 'Brak ID sesji' }), { status: 404 });
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) return new Response(JSON.stringify({ message: 'Brak sesji' }), { status: 404 });
  const user = await userFromSessionID(sessionId);
  if (!user) return new Response(JSON.stringify({ message: 'Użytkownik nie istnieje' }), { status: 404 });
  
  item.dropId = nanoid();
  item.ownerId = user.id;
  const filteredInv = user.inventory.filter(obj => JSON.stringify(obj) !== JSON.stringify(item));
  const updatedUser = await db.user.update({
    where: {
      id: session.userId
    },
    data: {
      inventory: {
        set: filteredInv
      },
      balance: {
        increment: item.skinPrice
      }
    }
  });
  return new Response(JSON.stringify({ message: 'Sukces', data: updatedUser }), { status: 200 });
}