import { useMutation } from '@tanstack/react-query';

import { userApi } from '../api/user';

/** Fire-and-forget infra call -- nothing currently reads push tokens back. */
export function useRegisterPushToken() {
  return useMutation({
    mutationFn: userApi.registerPushToken,
  });
}
