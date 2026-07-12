import { Role, Session, User } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { Pagination, PaginationDTO } from '@hed-hog/api-pagination';
import { Controller, Delete, Get, Param, ParseIntPipe } from '@nestjs/common';
import { SessionService } from './session.service';
@Role()
@Controller('sessions')
export class SessionController {
    constructor(
        private readonly sessionService: SessionService
    ) {}

    @Get('active')
    async getUserSessionsActive(
        @Pagination() paginationParams: PaginationDTO,
        @User() { id },
        @Locale() locale: string
    ) {
        return this.sessionService.getUserSessionsActive(paginationParams, id,locale)
    }

    @Get('user')
    async getUserSessions(
        @Pagination() paginationParams: PaginationDTO,
        @User() { id },
        @Locale() locale: string
    ) {
        return this.sessionService.getUserSessions(paginationParams, id,locale)
    }

    @Delete('revoke-all-other')
    async revokeAllOtherSessions(@User() { id }, @Session() sessionId: number){
        return this.sessionService.revokeAllOtherSessions(id, sessionId)
    }

    @Delete('revoke-all')
    async revokeAllSessions(@User() { id }){
        return this.sessionService.revokeAllSessions(id)
    }

    @Delete(':sessionId/revoke')
    async revokeSession(
        @User() { id: userId }, 
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Locale() locale: string
    ){
        return this.sessionService.revokeUserSession(userId, sessionId, locale)
    }
}
