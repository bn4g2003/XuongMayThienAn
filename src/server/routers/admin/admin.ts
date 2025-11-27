import { router } from '@/server/core/trpc';
import roleRouter from './role';
import usersRouter from './users';

const adminRouter = router({
  users: usersRouter,
  roles: roleRouter,
});

export default adminRouter;