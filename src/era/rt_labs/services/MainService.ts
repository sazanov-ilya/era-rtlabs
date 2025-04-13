import { GlobalUtils, Converter, EBaseLogLevel } from "./../../utils";
import { Service } from "./../../platform/core";
import { DataFactory, FilterBuilder } from "../../data/model";

// Доп. импорты
import { IIncomingCall, IIncomingCalls, } from "../model";
import { IncomingCalls, } from "../classes";

// Для отчетов из микросервиса
import { IInvocation, ITimeTables } from "../../platform/model";
import BuilderServices from "../../builder/services/BuilderServices";
import { ESeanceDirection, ESeanceResult, IArchiveConnection, IArchiveConnections, IArchiveSeance, IArchiveSeances, ICurrentACDCall, ICurrentACDCalls, ICurrentConnection, ICurrentConnections, ICurrentSeance, ICurrentSeances, IRecordInfo } from "../../callcenter/model";

// Для работы со звонками
import { EUpdateKind, IBaseEntity, IDataUpdateParams } from "../../base/model";
import { TimeTables } from "../../platform/classes";
import RootUsers from "../../root/classes/iam/RootUsers";
import IRootUsers from "../../root/model/iam/IRootUsers";
import { IUser } from "../../meet/model";
import { IRootUser } from "../../root/model";
import { ACDQueues, ArchiveConnections, ArchiveSeances, CurrentACDCalls, CurrentConnections, CurrentSeances } from "../../callcenter/classes";
//import ISessionInfo from "../../data/model/ISessionInfo";


class MainService extends Service {
    constructor() {
        super("rt_labs.MainService");

        // onCreateCode


        // 2. На время разработки дублируем в консоль все, 
        // что пишется в лог до уровня debug
        // Настравается в приложении "Админ платформы" (поиск по имени пакета)
        // по возрастанию степени детализаии:
        // core
        // error
        // warning
        // info
        // trace
        // debug
        this.log.consoleLevel = EBaseLogLevel.debug;


        // Пользователи
        //this._users = new RootUsers(this.context);

        // РАЗГОВОРЫ
        // Завершенные (callcenter/connections/Connection)
        //this._archiveConnections = new ArchiveConnections(this.context);
        //this._archiveConnections.onAfterInsert(this.afterInsertArchiveConnections.bind(this));

        // ЗВОНКИ 
        // Завершенные (callcenter/seances/ArchiveSeances)
        this._archiveSeances = new ArchiveSeances(this.context, { realtime: true });
        this._archiveSeances.onAfterInsert(this.afterInsertArchiveSeances.bind(this));
        //this._archiveSeances.onAfterUpdate(this.afterInsertArchiveSeances.bind(this));

        // ОЧЕРЕДИ
        // Новый звонок в очередь model/callcenter/acd/CurrentACDCalls
        this._currentACDCalls = new CurrentACDCalls(this.context);
        this._currentACDCalls.onAfterInsert(this.afterInsertCurrentACDCalls.bind(this));

        this._incomingCalls = new IncomingCalls(this.context); // Входящие из сценария


        this.load();
    }


    private _currentACDCalls: ICurrentACDCalls;       // Текущие звонки в очередь
    //private _archiveConnections: IArchiveConnections; // Завершенные разговоры
    private _archiveSeances: IArchiveSeances;         // Завершенные звонки
    private _incomingCalls: IIncomingCalls;           // Входящие из сценария


    async onInit() {
        await super.onInit();
        try {

            // onInitCode

            // 1. Вывод сообщения о запуске в консоль
            const message_init: string = '!!! rt_labs -> MainServise.ts -> onInit';
            //console.log(message_init);          
            this.log.info(message_init);

        }
        catch (e) {
            this.log.exception("onInit", e);
        }
    }


    async onTimer() {
        await super.onTimer();
        try {

            // onTimerCode

        }
        catch (e) {
            this.log.exception("onTimer", e);
        }
    }


    // Завершенный разговор
    async afterInsertArchiveConnections(params_: IDataUpdateParams<IArchiveConnection>) {
        try {
            //console.log(`getNewCurrentConnectionsInsert: ${params_.updateKind} id=${params_.id}`);
            this.log.debug('afterInsertArchiveConnections -> params_:\n', params_);
            console.log(params_.newData);  // ...

        }
        catch (e: any) {
            this.log.exception("afterInsertArchiveConnections", e);
        }
    }


    /**
    * Новый звонок в очередь (для обновления incomingCalls.acdQueue_id)
    * @param params_ - Данные сеанса звонка
    */
    async afterInsertCurrentACDCalls(params_: IDataUpdateParams<ICurrentACDCall>) {
        this.log.debug('afterInsertCurrentACDCalls -> params_:\n', params_);
        //console.log(params_.newData);

        try {
            // Параметры
            const seanceId = params_.newData.seance_link.id;
            const acdQueueId = params_.newData.acdQueue_id;
            // Очередь
            const acdQueuesTmp = new ACDQueues(this.context);
            const acdQueue = await acdQueuesTmp.getByIDStrong(acdQueueId);

            // Обновление звонка
            const interval = FilterBuilder.fixInterval("full");
            const filter = FilterBuilder.equals("seanceId", seanceId);
            const incomingCallsTmp = new IncomingCalls(this.context);
            const incomingCalls = await incomingCallsTmp.loadAll({ select: { interval, filter } });
            this.log.debug('afterInsertCurrentACDCalls -> incomingCalls', incomingCalls);

            if (incomingCalls.length === 1) { // Должна быть только одна строка
                const incomingCall = incomingCalls[0];
                incomingCall.acdQueue = acdQueue;
            }
        }
        catch (e: any) {
            this.log.exception('afterInsertCurrentACDCalls', e);
        }
    };


    /**
    * Завершенный звонок (обновление дополнительных параметров)
    * @param params_ - Данные сеанса звонка
    */
    // Обновение пользователя работает некорректно,
    // Пользователь есть, даже есть нет давлога. а есть только попоытка переключания
    async afterInsertArchiveSeances(params_: IDataUpdateParams<IArchiveSeance>) {
        this.log.debug('afterInsertArchiveSeances -> params_:\n', params_);

        try {
            // 1. Параметры
            const { id: seanceId, newData } = params_;
            const {
                timeStart,
                direction,
                durationIVR,
                durationACD,
                durationTalk,
                durationHold,
                durationWait,
                stopSideKind,
                result,
                sidesB
            } = newData || {};
            // Определяем Признак диалога по обшей продолжительности разговора
            //const isDialogue = durationTalk > 0;

            /*
            // Получаем user_id из последнего элемента sidesB с kind="user"
            // Тут последний пользователь даже без диалога, попоытки переключения на оператора.
            // Логику перенес м мониторинг новых звонков
            const getLastUserId = (sides: any[] | undefined): string | undefined => {
                return sides?.filter(side => side?.kind === "user").pop()?.user_id;
            };
            const userId = getLastUserId(sidesB);
            const user = await this.getUserObject(userId);
            
            // true, если user существует
            const isDialogue: boolean = user !== undefined;
            */


            // 2. Поиск нужного оператора
            const user = await this.getUserFromArchiveSeances(seanceId);

            // true, если user существует
            const isDialogue: boolean = user !== undefined;


            // 3. Обновление звонка
            const interval = FilterBuilder.fixInterval("full")
            const filter = FilterBuilder.equals("seanceId", seanceId);
            const incomingCallsTmp = new IncomingCalls(this.context);
            const incomingCalls = await incomingCallsTmp.loadAll({ select: { interval, filter } });

            if (incomingCalls.length === 1) { // Должна быть только одна строка
                const incomingCall = incomingCalls[0];
                incomingCall.callDttm = new Date(timeStart);
                incomingCall.direction = toESeanceDirection(direction); // as ESeanceDirection
                incomingCall.result = toESeanceResult(result);          // as ESeanceResult
                incomingCall.durationACD = (durationACD);
                incomingCall.durationWait = (durationWait);
                incomingCall.durationTalk = (durationTalk);
                incomingCall.durationHold = (durationHold);
                incomingCall.durationIVR = (durationIVR);
                incomingCall.stopSideKind = (stopSideKind);
                incomingCall.isAcd = containsKind(sidesB, 'acd');
                incomingCall.isDialogue = isDialogue;
                incomingCall.user = user;
                //incomingCall.isDialogue = containsKind(JSON.parse(sidesB), 'user');
            }
        }
        catch (e: any) {
            this.log.exception("afterInsertArchiveSeances", e);
        }
    }


    /**
    * Поцедура -> "Входящий звонок"
    * поверка признаков "ЧС" и "Рабочее время"
    * сохранение нового звонка для отчетности
    * возврат признаков "ЧС" и "Рабочее время"
    */
    async incomingCall_exec(invocation_: IInvocation) {
        //this.log.debug('incomingCall_exec -> invocation_', invocation_);

        try {
            // Параметры
            const toStringSafe = (value: any): string => value?.toString() ?? '';
            const seanceId = toStringSafe(invocation_.request?.seanceId);
            const callId = toStringSafe(invocation_.request?.callId);
            const calledId = toStringSafe(invocation_.request?.calledId);
            const callerId = toStringSafe(invocation_.request?.callerId);

            /*
            // 1. Рабочий график платформы
            // Пример проверки по всем расписаниям
            const timeTables: ITimeTables = new TimeTables(this.context);
            const timeTablesTmp = await timeTables.loadAll();
            //this.log.debug('timeTablesTmp', timeTablesTmp);

            const currentDttm: Date = new Date();
            let isNotWorking: boolean = false; // По умолчанию - рабочее время
            // Проверка по всем графикам
            for (let timeTable_ of timeTablesTmp) {
                const schedule = await this.invoke('platform.HolderService', 'TimeTable_execute',
                    {
                        id: timeTable_.id,
                        parameters: {
                            datetime: currentDttm
                        }
                    });
                //this.log.debug('schedule: ', schedule);

                // Если найден выходной
                if (schedule.state === 'success') {
                    if (schedule.response?.result) {
                        isNotWorking = true;
                        //this.log.debug('isDayOff: ', isDayOff);
                        break;
                    }
                }
                else {
                    // Добавить преобразовние schedule
                    this.log.debug('incomingCall_exec -> Ошибка проверки Графика работы: ', schedule);
                }
            };
            */


            // 1. Рабочий график
            // Проверка по одному расписанию
            const currentDttm: Date = new Date();
            const scheduleId = '39ce9516-af7a-402e-b497-d37f90433ff0'
            const schedule = await this.invoke('platform.HolderService', 'TimeTable_execute',
                {
                    id: scheduleId,
                    parameters: {
                        datetime: currentDttm
                    }
                });

            let isNotWorking: boolean = false; // По умолчанию - рабочее время

            // Если найден выходной
            if (schedule.state === 'success') {
                if (schedule.response?.result) {
                    isNotWorking = true;
                }
            }
            else {
                // Добавить преобразовние schedule
                this.log.debug('incomingCall_exec -> Ошибка проверки Графика работы: ', schedule);
            }


            // 2. Проверка по ЧС
            const params = JSON.stringify({ phone: callerId });
            const blacklist = await this.invoke('blacklist.MainService', 'checkPhoneByBlacklist_exec', params);
            //this.log.debug('incomingCall_exec -> blacklist', blacklist);
            //{"state":"success","response":{"result":false}}

            let isBlacklist = false
            if (blacklist.state === 'success') {
                if (blacklist.response?.result) {
                    isBlacklist = true;
                }
            }
            else {
                this.log.debug('incomingCall_exec -> Ошибка проверки ЧС: ', blacklist);
            }
            //this.log.debug('blacklist: ', blacklist);

            // 3. Сохранение звонка
            // Через локальнцю переменую ошибка записи Entities ... are not ready ...
            // Запись сработала только через глобальное объявление как this.///
            await this._incomingCalls.addNew(incomingCall_ => {
                incomingCall_.insertDttm = new Date();
                incomingCall_.seanceId = seanceId;
                incomingCall_.calledId = calledId;
                incomingCall_.callerId = callerId;
                incomingCall_.isNotWorking = isNotWorking;
                incomingCall_.isBlacklist = isBlacklist;
                incomingCall_.isAcd = false;
                incomingCall_.isDialogue = false;
                incomingCall_.isRating = false;
            });


            // 4. Возврат результата в сценарий
            return {
                isNotWorking, isBlacklist
            }
        }
        catch (e) {
            this.log.exception('incomingCall_exec -> exception', e);
            return false;
        }
    }


    /**
    * Поцедура -> "Cохранение оценок качества обслуживания"
    */
    async rating_exec(invocation_: IInvocation) {
        //this.log.debug('rating_exec -> invocation_', invocation_);

        try {
            // Параметры
            const { request } = invocation_;
            const seanceId: string = request?.seanceId?.toString() ?? '';
            const { timeRating = 0, clarityRating = 0, friendlinessRating = 0, competenceRating = 0 } = request?.ratings ?? {};

            // Проверка наличия хотя бы одной оценки
            const hasAnyRating = [timeRating, clarityRating, friendlinessRating, competenceRating]
                .some(rating => rating > 0);

            // Общая оценка (только если есть хотя бы одна оценка)
            const overallRating = hasAnyRating
                ? Math.min(...[timeRating, clarityRating, friendlinessRating, competenceRating].filter(num => num !== 0))
                : 0;

            // Обновление оценки
            const interval = FilterBuilder.fixInterval("full")
            const filter = FilterBuilder.equals("seanceId", seanceId);
            const incomingCallsTmp = new IncomingCalls(this.context);
            const incomingCalls = await incomingCallsTmp.loadAll({ select: { interval, filter } });
            //this.log.debug('getRating_exec -> incomingCalls', incomingCalls);

            if (incomingCalls.length === 1) { // Должна быть только одна строка
                // Устанавливаем isRating только если есть хотя бы одна оценка
                incomingCalls[0].isRating = hasAnyRating;

                if (hasAnyRating) {
                    if (timeRating) incomingCalls[0].timeRating = timeRating;
                    if (clarityRating) incomingCalls[0].clarityRating = clarityRating;
                    if (friendlinessRating) incomingCalls[0].friendlinessRating = friendlinessRating;
                    if (competenceRating) incomingCalls[0].competenceRating = competenceRating;
                    if (overallRating) incomingCalls[0].overallRating = overallRating;
                }
            }

            // 4. Возврат результата
            return { result: true };
        }
        catch (e) {
            this.log.exception('rating_exec -> exception', e);
            return false;
        }
    }


    // Пользователь из звонка
    async getUserFromArchiveSeances(seanceId: string): Promise<IRootUser | undefined> {
        //this.log.debug('getUserFromArchiveSeances ->\nseanceId:', seanceId);

        try {
            let archiveConnectionsTmp = new ArchiveConnections(this.context);

            // 1. Ищем диалоги по звонку
            // "nativeDirection": "outer -> user",
            // "direction": "in",
            const filter = {
                select:
                {
                    interval: FilterBuilder.fixInterval('full'),
                    filter: FilterBuilder.and(
                        FilterBuilder.equals('seance_link.id', seanceId),         // Диалоги по звонку
                        FilterBuilder.equals('sideA.kind', 'outer'),              // Внешний абонент
                        FilterBuilder.equals('sideB.kind', 'user'),               // Преключение на оператора
                        FilterBuilder.equals('nativeDirection', 'outer -> user'), // Тип направления   
                        [">", ["property", "durationTalk"], ["const", 0]]         // Время диалога (есть всегда)     
                    )
                }
            };

            const archiveConnections = await archiveConnectionsTmp.loadAll(filter);
            //this.log.debug('getUserFromArchiveSeances ->\narchiveConnections:\n', archiveConnections);


            //Даты:
            //- 2025-04-04T10:58:01.448Z (старая)
            //- 2025-04-04T10:59:01.448Z (новая)

            //// 2. Сортировка по времени `timeStart` (от новых к старым) 
            //// ПОСЛЕДНИЙ, кто говорил с абонентом
            //const sortedConnections = [...archiveConnections].sort((a, b) =>
            //    new Date(b.timeStart).getTime() - new Date(a.timeStart).getTime()
            //);

            // 2. Сортировка по времени `timeStart` (от старых к новым)
            // ПЕРВЫЙ, кто говорил с абонентом
            const sortedConnections = [...archiveConnections].sort((a, b) =>
                new Date(a.timeStart).getTime() - new Date(b.timeStart).getTime()
            );
            this.log.debug('getUserFromArchiveSeances ->\nsortedConnections:\n', sortedConnections);


            // 3. Получение `sideB.user_id` из первой записи 
            const firstUserId = sortedConnections[0]?.sideB?.user_id;
            //this.log.debug('getUserFromArchiveSeances ->\nlatestUserId:\n', firstUserId);


            // 4. Ищем и возвращаем пользователя
            const user = await this.getUserObject(firstUserId);

            return user;
        }
        catch (e) {
            this.log.exception('getUserObject -> exception', e);
        }
    }


    /**
    * Получает объект пользователя по идентификатору
    * @param userId - Идентификатор пользователя (строка или undefined)
    * @returns Промис, разрешающийся в объект пользователя (IRootUser) или undefined, если:
    *          - пользователь не найден
    *          - передан undefined вместо userId
    *          - произошла ошибка при запросе
    */
    async getUserObject(userId: string | undefined): Promise<IRootUser | undefined> {
        //this.log.debug('getUserObject -> userId', userId);

        try {
            let usersTmp: IRootUsers = new RootUsers(this.context);
            let user: IRootUser | undefined = undefined;

            // Ищем пользователя в БД, если он есть
            let filter = FilterBuilder.equals('id', userId);
            const users = await usersTmp.loadAll({ select: { filter } });
            if (users.length > 0) {
                user = users[0]
            }
            //this.log.debug('getUserObject -> user:\n', user);

            return user;
        }
        catch (e) {
            this.log.exception('getUserObject -> exception', e);
        }
    }


    // ////////// //
    // ОТЧЕТНОСТЬ //
    // Есть идея перенести в отдельный сервис

    // Отчет по оценкам качества с группировкой
    async reportRatingGroup(invocation_: IInvocation) {
        this.log.debug('reportRatingGroup -> invocation_', invocation_);

        try {
            /*
            // ID пользователя
            const user_id = invocation_.request?.user_id;
            // Роли пользователя
            const roles = BuilderServices.builderContext.getUserRoles(user_id);
            */
            /*
            // Минимальный код
            return {
                data: [
                    { id: "123a", name: "123" },
                    { id: "123b", name: "123" },
                    { id: "123c", name: "567" },
                ]
            }
            */
            /*
            // Минимальный код (2)
            const data = [
                { id: "123a", name: "123" },
                { id: "123b", name: "123" },
                { id: "123c", name: "567" },
            ]
    
            return {
                data
            };
            */

            // Каждая стока отчета представляет словарь
            let timeRating = {
                name: 'Время ожидания ответа оператора',
                r1: 0,
                r2: 0,
                r3: 0,
                r4: 0,
                r5: 0,
            }

            let friendlinessRating = {
                name: 'Доброжелательность оператора',
                r1: 0,
                r2: 0,
                r3: 0,
                r4: 0,
                r5: 0,
            }

            let competenceRating = {
                name: 'Компетентность и понимание оператором проблемы пользователя',
                r1: 0,
                r2: 0,
                r3: 0,
                r4: 0,
                r5: 0,
            }

            let clarityRating = {
                name: 'Ясность ответа оператора',
                r1: 0,
                r2: 0,
                r3: 0,
                r4: 0,
                r5: 0,
            }

            let totalRating = {
                name: 'Всего оценок',
                r1: 0,
                r2: null,
                r3: null,
                r4: null,
                r5: null,
            }

            let totalCallWithoutRating = {
                name: 'Без оценки',
                r1: 0,
                r2: null,
                r3: null,
                r4: null,
                r5: null,
            }

            let totalCall = {
                name: 'Всего обращений',
                r1: 0,
                r2: null,
                r3: null,
                r4: null,
                r5: null,
            }

            // Оценки качества хранятся в таблице входящих
            const ratingsTmp = new IncomingCalls(this.context);
            const interval = [invocation_.request?.parameters?.timeStart, invocation_.request?.parameters?.timeFinish];
            const filter = FilterBuilder.equals("isDialogue", true); // Только диалоги
            //this.log.debug('interval', interval);

            // Данные согласно фильтра
            const ratings = await ratingsTmp.loadAll({ select: { interval, filter } });
            //this.log.debug('ratings', ratings);


            for (let rating_ of ratings) {

                // Общее число звонков +1
                totalCall.r1 = totalCall.r1 + 1

                // Есть запуск оценки качества?
                if (rating_.isRating) {

                    // Есть оценка "Время ожидания ответа"?
                    if (rating_.timeRating) {

                        // Общее число оценок +1
                        totalRating.r1 = totalRating.r1 + 1

                        if (rating_.timeRating === 1) {
                            timeRating.r1 = timeRating.r1 + 1
                        }
                        if (rating_.timeRating === 2) {
                            timeRating.r2 = timeRating.r2 + 1
                        }
                        if (rating_.timeRating === 3) {
                            timeRating.r3 = timeRating.r3 + 1
                        }
                        if (rating_.timeRating === 4) {
                            timeRating.r4 = timeRating.r4 + 1
                        }
                        if (rating_.timeRating === 5) {
                            timeRating.r5 = timeRating.r5 + 1
                        }
                    }

                    // Есть оценка "Ясность ответа"?
                    if (rating_.clarityRating) {

                        // Общее число оценок +1
                        totalRating.r1 = totalRating.r1 + 1

                        if (rating_.clarityRating === 1) {
                            clarityRating.r1 = clarityRating.r1 + 1
                        }
                        if (rating_.clarityRating === 2) {
                            clarityRating.r2 = clarityRating.r2 + 1
                        }
                        if (rating_.clarityRating === 3) {
                            clarityRating.r3 = clarityRating.r3 + 1
                        }
                        if (rating_.clarityRating === 4) {
                            clarityRating.r4 = clarityRating.r4 + 1
                        }
                        if (rating_.clarityRating === 5) {
                            clarityRating.r5 = clarityRating.r5 + 1
                        }
                    }

                    // Есть оценка "Доброжелательность ответа"?
                    if (rating_.friendlinessRating) {

                        // Общее число оценок +1
                        totalRating.r1 = totalRating.r1 + 1

                        if (rating_.friendlinessRating === 1) {
                            friendlinessRating.r1 = friendlinessRating.r1 + 1
                        }
                        if (rating_.friendlinessRating === 2) {
                            friendlinessRating.r2 = friendlinessRating.r2 + 1
                        }
                        if (rating_.friendlinessRating === 3) {
                            friendlinessRating.r3 = friendlinessRating.r3 + 1
                        }
                        if (rating_.friendlinessRating === 4) {
                            friendlinessRating.r4 = friendlinessRating.r4 + 1
                        }
                        if (rating_.friendlinessRating === 5) {
                            friendlinessRating.r5 = friendlinessRating.r5 + 1
                        }
                    }

                    // Есть оценка "Компетентность ответа"?
                    if (rating_.competenceRating) {

                        // Общее число оценок +1
                        totalRating.r1 = totalRating.r1 + 1

                        if (rating_.competenceRating === 1) {
                            competenceRating.r1 = competenceRating.r1 + 1
                        }
                        if (rating_.competenceRating === 2) {
                            competenceRating.r2 = competenceRating.r2 + 1
                        }
                        if (rating_.competenceRating === 3) {
                            competenceRating.r3 = competenceRating.r3 + 1
                        }
                        if (rating_.competenceRating === 4) {
                            competenceRating.r4 = competenceRating.r4 + 1
                        }
                        if (rating_.competenceRating === 5) {
                            competenceRating.r5 = competenceRating.r5 + 1
                        }
                    }
                }
                else {
                    // Число звонков без оценки +1
                    totalCallWithoutRating.r1 = totalCallWithoutRating.r1 + 1
                }
            }
            //this.log.debug("totalCall", totalCall);

            // Финальный отчет
            const data = []

            data.push(timeRating);
            data.push(friendlinessRating);
            data.push(competenceRating);
            data.push(clarityRating);
            data.push(totalRating);
            data.push(totalCallWithoutRating);
            data.push(totalCall);

            //this.log.debug('reportRatingGroup -> data', data);

            return {
                data
            }
        }
        catch (e) {
            this.log.exception('reportRatingGroup', e);

            return false;
        }
    }


    // /////////////////////////////
    // Отчет по количеству обрашений
    // (по таблице входящих в ivr)
    // ///////////////////////////
    async reportIncomingCalls(invocation_: IInvocation) {
        this.log.debug('reportIncomingCalls -> invocation_', invocation_);

        try {
            //console.log(invocation_.request);
            /*
            // ID пользователя
            const user_id = invocation_.request?.user_id;
            // Роли пользователя
            const roles = BuilderServices.builderContext.getUserRoles(user_id);
            */

            //const stringToBoolean = (value: string): boolean => value.toLowerCase() === 'true';
            const stringToBoolean = (value: string | null): boolean | null =>
                value === null ? null : typeof value === 'string' ? value.toLowerCase() === 'true' : null;

            // Интерфейс для структуры отчета о входящих вызовах
            interface ILineReportIncomingCalls {
                interval: string;
                work_count: number;
                off_count: number;
                work_percent: number;
                off_percent: number;
            }


            // Инициализация массива для хранения данных отчета
            let data: ILineReportIncomingCalls[] = [];
            let totalDyOff = 0;    // Счетчик выходных вызовов
            let totalDayWork = 0;   // Счетчик рабочих вызовов

            const isBlacklist = invocation_.request?.parameters?.isBlacklist
            this.log.debug('reportIncomingCalls -> isBlacklist:', isBlacklist);

            const incomingCallsTmp = new IncomingCalls(this.context);
            const interval = [invocation_.request?.parameters?.timeStart, invocation_.request?.parameters?.timeFinish];
            //this.log.debug('getReportIncomingCalls -> interval', interval);
            //this.log.debug('getReportIncomingCalls -> filter', filter);

            // Есть идея использования отдельных минифильтров под каждый фильтр
            // const isBlacklistFilter = ["or", ["isnull", ["const", "isBlacklist"]], ["==", ["property", "isBlacklist"], ["bool", ["const", isBlacklist]]]]

            // С учетом признака ЧС
            const isBlacklistFilter = FilterBuilder.equals("isBlacklist", ["const", isBlacklist]);

            // Прлучаем фильтр для выборки данных
            let selectFilter: any
            if (isBlacklist !== null && isBlacklist !== undefined) { // Проверка признака ЧС
                selectFilter = {
                    select: {
                        interval: interval,
                        filter: isBlacklistFilter
                    }
                }
            } else {
                selectFilter = {
                    select: {
                        interval: interval
                    }
                }
            }

            // ///
            /* Рекомендации GPT
            const selectFilter = {
                select: {
                    interval: interval,
                    ...(isBlacklist !== null && isBlacklist !== undefined ? { filter: FilterBuilder.equals("isBlacklist", ["const", isBlacklist]) } : {})
                }
            };
            */
            // ///

            // Данные согласно филтра
            const incomingCalls = await incomingCallsTmp.loadAll(selectFilter);
            //const incomingCalls = await incomingCallsTmp.loadAll({ select: { interval, filter } });
            //this.log.debug('getReportIncomingCalls -> incomingCalls:', incomingCalls);

            if (incomingCalls.length) { // Формируем отчет

                // Часовые интервалы
                const jsonIntervals = getHourIntervals();
                //this.log.debug('jsonIntervals', jsonIntervals);

                // Преобразуем JSON-строку обратно в объект
                const parsedIntervals = JSON.parse(jsonIntervals);
                //this.log.debug('parsedIntervals', parsedIntervals);

                // Добавляем в отчет все возможные интервалы
                for (const interval of parsedIntervals.intervals) {
                    data.push({ interval: interval, work_count: 0, off_count: 0, work_percent: 0, off_percent: 0 });
                    //console.log(interval);
                };
                //this.log.debug('data', data);


                for (let incomingCall_ of incomingCalls) {

                    // Интервал из даты дате
                    const hourInterval: string = getHourInterval(incomingCall_.insertDttm);
                    //this.log.debug('hourInterval', hourInterval);

                    // Поиск индекса элемента по значению интервала
                    const existsInterval: number = findIndexByInterval(data, hourInterval);
                    //console.log(`!INTERVAL!: ${incomingCall_.callDttm} interval = ${hourInterval} exists = ${existsInterval} `);

                    if (existsInterval !== -1) { // Если интервал найден

                        // Накапливаем дни
                        if (incomingCall_.isNotWorking) { // Выходной
                            data[existsInterval].off_count += 1;
                            totalDyOff = totalDyOff + 1
                        }
                        else { // Рабочий
                            data[existsInterval].work_count += 1;
                            totalDayWork = totalDayWork + 1
                        }
                    }
                };


                // ОБщее число звонков
                const totalCall: number = totalDayWork + totalDyOff
                // Считаем %
                for (let d of data) {
                    d.work_percent = roundToTwoDecimals((d.work_count / divisor(totalCall)) * 100);
                    d.off_percent = roundToTwoDecimals((d.off_count / divisor(totalCall)) * 100);
                };
                // Добавляем итоги
                const total: ILineReportIncomingCalls = {
                    interval: 'Итого:',
                    work_count: totalDayWork,
                    off_count: totalDyOff,
                    work_percent: roundToTwoDecimals((totalDayWork / divisor(totalCall)) * 100),
                    off_percent: roundToTwoDecimals((totalDyOff / divisor(totalCall)) * 100)
                };
                data.push(total);

            }

            else { // Заглушка для пустого отчета
                data = [
                    {
                        "interval": "Нет данных",
                        "work_count": 0,
                        "off_count": 0,
                        "work_percent": 0,
                        "off_percent": 0
                    }
                ]
            };

            // Возврат результата
            return {
                data
            };
        }
        catch (e) {
            this.log.exception('reportIncomingCalls', e);

            return false;

        }
    }
}

/*
// Функция для получения значения по ключу
function getValueByKey(session: ISessionInfo, key: string): string | undefined {
    return session[key]; // Возвращает значение по указанному ключу
}
*/


// ///////////////////////////////////
// Дополнительные функции и интерфейсы
// ///////////////////////////////////

// Интерфейс строки отчета
interface ILineReport {
    interval: string;
    day_work: number;
    day_off: number;
};

// Формат строки отчета ReportAcdCall
interface ILineReportAcdCall {
    interval: string;
    work_count: number;
    off_count: number;
    work_percent: number;
    off_percent: number;
};


// Процедура вернет первый элемент списка или undefined
function getFirstItemOrUndefined<T>(arr: T[]): T | undefined {
    return arr[0];
}


// Функция возвращает строку времени в формате "01:00:00"
function getFormatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0'); // Получаем часы и добавляем ведущий ноль
    const minutes = '00'; // Минуты
    const seconds = '00'; // Секунды

    return `${hours}:${minutes}:${seconds}`;
}

// Функция форматирования часового интервала
// Пример: "00:00:00 - 01:00:00"
function formatHourInterval(start: string, end: string): string {
    return `${start} - ${end}`; // Форматируем строку интервала
}

// Функция возвращает интервал в формате "00:00:00 - 01:00:00"
function getHourInterval(date: Date): string {
    const start = getFormatTime(date);
    //const end: string = getFormatTime(new Date(date.setHours(date.getHours() + 1)))
    const end = getFormatTime(new Date(date.getTime() + 3600000)); // + 1 час

    return formatHourInterval(start, end);
}

// Функция возвращает JSON со списком часовых интервалов 
// в разрезе суток в формате "00:00:00 - 01:00:00"
function getHourIntervals(): string {
    const intervals: string[] = [];

    for (let hour = 0; hour < 24; hour++) {
        const start = String(hour).padStart(2, '0');
        const end = String((hour + 1) % 24).padStart(2, '0'); // С приведением 23:00:00 -> 00:00:00

        const interval = formatHourInterval(`${start}:00:00`, `${end}:00:00`);
        intervals.push(interval);
    }

    return JSON.stringify({ intervals }); // Возвращаем JSON-строку
}


/*
// Процедура для поиска индекса по имени или -1
function findIndexByInterval(arr: ILineReport[], search: string): number {
    return arr.findIndex(LineReport => LineReport.interval === search);
}
*/

// Интерфейс с обязательным ключом interval
interface IHasInterval {
    interval: string;
}

// Процедура для поиска индекса по значению interval
function findIndexByInterval<T extends IHasInterval>(arr: T[], search: string): number {
    return arr.findIndex(item => item.interval === search);
}

// Проверка деления на 0
function divisor(n: number) {
    return (n = 0 ? 0.000001 : n);
}

// Округление до сотых
function roundToTwoDecimals(num: number): number {
    return parseFloat(num.toFixed(2));
}


// ///////////////////////////////////////
// Функция для получения интервала по дате
// ///////////////////////////////////////

/*
// Список интервалов
// Не совсем подошел, поскольку строкой нельзя передать значение
// в качестве входящего должно быть значение типа
// const intervalValue: IntervalType = IntervalType.Month
// А следовательно требуется более глобальное создание перечисления 
// (на уровне системных объектов)
// И его использование в качестве фильтра
// НО это не точно)
enum IntervalType {
    Month = 'month',
    Week = 'week',
    Day = 'day',
    Sixty = '60',
    Thirty = '30',
    Fifteen = '15',
    Five = '5'
}

function getIntervalName(inputDate: Date, intervalType: IntervalType): string {
../
*/

function getIntervalName(inputDate: Date, intervalType: 'month' | 'week' | 'day' | '60' | '30' | '15' | '5'): string {

    // Создаем копию даты
    const date = new Date(inputDate);

    // Дата с нулевой датой
    const only_date = new Date(date);
    only_date.setHours(0, 0, 0, 0);

    // Дата с нулевым временем
    const only_time = new Date(date);
    date.setFullYear(1900, 0, 1);

    let result: string = ''

    if (intervalType === 'month') {

        //По месяцам 
        // Интервал - первый день месяца в формате
        // 2024-10-01 00:00:00.000
        // Формат для вывода 
        // "Октябрь 2024"

        // Первый день месяца
        const startMonth = new Date(only_date.getFullYear(), only_date.getMonth(), 1);
        /*
        // Последний день месяца
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const endMonth = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());
        */

        // Массив названий месяцев
        const months: string[] = [
            "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
            "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
        ];
        // Получаем месяц и год
        const month = months[startMonth.getMonth()]; // Месяцы начинаются с 0
        const year = startMonth.getFullYear();

        /*
        // Значение интервала
        const intervalDate = startMonth
        */
        // Наименование интервала
        result = `${month} ${year} `;


    } else if (intervalType === 'week') {

        //По неделям 
        // Интервал - первый день недели в формате
        // 2024-10-01 00:00:00.000
        // Формат для вывода 
        // "30.09—06.10"

        // Копируем дату
        const startWeek = new Date(only_date);

        // Получаем день недели (0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
        const dayOfWeek = startWeek.getDay();

        // Если воскресенье (0), то возвращаем 6 (суббота)
        // Иначе, просто вычитаем dayOfWeek - 1 (чтобы получить понедельник)
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        // Первый день недели (понедельник)
        startWeek.setDate(startWeek.getDate() - daysToSubtract);

        // Последний день недели (воскресенье)
        const endOfWeek = new Date(startWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Добавляем 6 дней для получения воскресенья
        endOfWeek.setHours(23, 59, 59, 999); // Время на 23:59:59.999

        /*
        // Значение интервала
        const intervalDate = startWeek
        */
        // Наименование интервала "30.09—06.10"
        result = startWeek.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }).replace(',', '') + '-' + endOfWeek.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }).replace(',', '');


    } else if (intervalType === 'day') {

        // По дням
        // Интервал - день из даты в формате
        // 2024-10-01 00:00:00.000 
        // Формат для вывода 
        // "01.10.2024"

        // Копируем дату
        const startDay = new Date(only_date);

        /*
        // Значение интервала
        const intervalDate = startDay
        */
        // Наименование интервала "01.10.2024"
        result = startDay.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', ''); // Убираем запятую, если она есть


        //} else if (type === '60') {
    } else if (['60', '30', '15', '5'].includes(intervalType)) {

        // Минутные интервалы
        // ...

        // Копируем время
        const timeStart = new Date(only_time);

        // Устанавливаем множитель
        let intMin: number;

        switch (intervalType) {
            case '5':
                intMin = 5;
                break;
            case '15':
                intMin = 15;
                break;
            case '30':
                intMin = 30;
                break;
            case '60':
                intMin = 60;
                break;
            //default:
            //    intMin = 30; // Значение по умолчанию
        }

        // Часовая зона (смещение в минутах)
        const timezoneOffset = timeStart.getTimezoneOffset();

        //// Число минут
        //const countMinutesInDate = (timeStart.getHours() * 60) + timeStart.getMinutes();
        // Округляем минуты до интервала
        const countMinutes = Math.floor(((timeStart.getHours() * 60) + timeStart.getMinutes()) / intMin) * intMin;

        // Создаем базовую дату
        const intervalStart = new Date(0); // 0 - это количество миллисекунд с начала эпохи Unix
        // Время начала интервала
        intervalStart.setMinutes(intervalStart.getMinutes() + countMinutes);

        // Корректируем время на часовую зону (смещение в минутах) 
        intervalStart.setMinutes(intervalStart.getMinutes() + timezoneOffset);

        // Время окончания интервала
        const intervalEnd = new Date(intervalStart);
        intervalEnd.setMinutes(intervalEnd.getMinutes() + intMin); // Увеличиваем минуты

        /*
        // Значение интервала
        const intervalDate = intervalStart
        */
        // Наименование интервала "30.09—06.10"
        result = intervalStart.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(',', '') + '-' + intervalEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(',', '');

    } else {
        throw new Error("Invalid type.");
    }

    return result; // Возвращаем интервал
}

// declarationsCode


// functionsCode

// Функция для безопасного преобразования строки в ESeanceDirection
function toESeanceDirection(value: string): ESeanceDirection | undefined {
    if (Object.values(ESeanceDirection).includes(value as ESeanceDirection)) {
        return value as ESeanceDirection;
    }
    return undefined;
}

// Функция для безопасного преобразования строки в ESeanceResult:
function toESeanceResult(value: string): ESeanceResult | undefined {
    if (Object.values(ESeanceResult).includes(value as ESeanceResult)) {
        return value as ESeanceResult;
    }
    return undefined;
}

// Функция для проверки наличия хотя бы одного элемента с задвнным значением kind,
function containsKind(items: any[], kindToCheck: string): boolean {
    return items.some(item => item.kind === kindToCheck);
}


export default MainService;
