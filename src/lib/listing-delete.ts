import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

type DeleteListingRequest = {
  listingId: string;
};

type DeleteListingResponse = {
  ok: boolean;
  listingId: string;
  deletedPublicIds?: string[];
};

export async function deleteListingSecure(listingId: string): Promise<DeleteListingResponse> {
  const callable = httpsCallable<DeleteListingRequest, DeleteListingResponse>(
    functions,
    'deleteListing'
  );

  const result = await callable({ listingId });
  return result.data;
}