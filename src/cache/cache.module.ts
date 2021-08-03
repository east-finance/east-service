import { CacheModule, Global, Module } from '@nestjs/common'


@Global()
@Module({
  providers: [],
  imports: [
    CacheModule.register({
      max: 10,
      ttl: 60
    })
  ],
  exports: [CacheModule]
})
export class AppCacheModule {}
