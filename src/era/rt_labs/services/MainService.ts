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
        this._users = new RootUsers(this.context);
        //// Рабочий график платформы (platform/timetable/TimeTables)
        //this._timeTables = new TimeTables(this.context);

        /* ПОКА НЕ ТРЕБУЕТСЯ
        // РАЗГОВОРЫ 
        // Новые 
        this._currentConnections = new CurrentConnections(this.context);
        this._currentConnections.onAfterInsert(this.afterInsertCurrentConnections.bind(this));
        // Завершенные 
        this._archiveConnections = new ArchiveConnections(this.context);
        this._archiveConnections.onAfterInsert(this.afterInsertArchiveConnections.bind(this));
        */

        // ЗВОНКИ 
        //// Новые
        //this._сurrentSeances = new CurrentSeances(this.context);
        //this._сurrentSeances.onAfterInsert(this.afterInsertCurrentSeances.bind(this));
        // Завершенные (callcenter/seances/ArchiveSeances)
        this._archiveSeances = new ArchiveSeances(this.context, { realtime: true });
        this._archiveSeances.onAfterInsert(this.afterInsertArchiveSeances.bind(this));
        //this._archiveSeances.onAfterUpdate(this.afterInsertArchiveSeances.bind(this));


        // ОЧЕРЕДИ
        // Новый звонок в очередь model/callcenter/acd/CurrentACDCalls
        this._currentACDCalls = new CurrentACDCalls(this.context);
        this._currentACDCalls.onAfterInsert(this.afterInsertCurrentACDCalls.bind(this));

        // Локально в процедуре
        ////// Вхоящие звонки
        ////this._incomingCalls = new IncomingCalls(this.context);
        //// Оценки качества
        //this._ratings = new Ratings(this.context);

        this._incomingCalls = new IncomingCalls(this.context); // Входящие из сценария

        /* НЕ АКТУАЛЬНО
        // "По ЧС"
        this._blacklistTypes = new BlackListTypes(this.context);

        this._blacklists = new BlackLists(this.context);
        this._blacklists.onAfterUpdate(this.afterUpdateBlacklists.bind(this));

        this._recommendedBLs = new RecommendedForBlacklists(this.context);
        this._recommendedBLs.onAfterUpdate(this.afterUpdateRecommendedBls.bind(this));
        */


        //// "Звонки в очередь"
        //this._customAcdCalls = new AcdCalls(this.context);

        // Дата/время для проверки часового интервала,
        // переопределяется каждый час
        //this._hourInterval = GlobalUtils.nowTimeStamp();


        this.load();
    }


    private _users: IRootUsers;                       // Пользователи (для ЧС)

    //private _currentConnections: ICurrentConnections; // Текущие разговоры
    //private _archiveConnections: IArchiveConnections; // Завершенные разговоры

    private _currentACDCalls: ICurrentACDCalls;         // Текущие звонки в очередь

    //private _сurrentSeances: ICurrentSeances;         // Текущие звонки
    private _archiveSeances: IArchiveSeances;           // Завершенные звонки


    // Проектные
    //private _customAcdCalls: IAcdCalls; // "Звонки в очередь"  

    // Локально в процедуре
    ////private _incomingCalls: IIncomingCalls; // "Входящие звонки"
    //private _ratings: IRatings; // Оценки качества

    private _incomingCalls: IIncomingCalls; // Входящие из сценария

    //private _blacklists: IBlackLists; // ЧС
    //private _blacklistTypes: IBlackListTypes; // Типы ЧС
    //private _recommendedBLs: IRecommendedForBlacklists; // Рекомендовано для ЧС

    //private _hourInterval: number;


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

            /* НЕ АВТУАЛЬНО
            const now = GlobalUtils.nowTimeStamp();
            //const oneHour = 3600000; // 1 час в миллисекундах
            const oneHour = 60000; // 1 минута

            // Прошел 1 час
            if (now - this._hourInterval > oneHour) {

                //this.log.debug("onTimer -> this.startTime", this.startTime);

                //this.deleteTempPhonesFromBlacklist(); // Удаление временных номеров
                this._hourInterval = GlobalUtils.nowTimeStamp();  // Переопределение времени

                //this.log.debug("onTimer -> this.startTime", this.startTime);
            }
            //this.log.debug("onTimer -> this.startTime", this.startTime);
            */
        }
        catch (e) {
            this.log.exception("onTimer", e);
        }
    }


    //// Новый разговор
    //async afterInsertCurrentConnections(params_: IDataUpdateParams<ICurrentConnection>) {
    //    try {
    //        //console.log(`getNewCurrentConnectionsInsert: ${params_.updateKind} id=${params_.id}`);
    //        this.log.debug('afterInsertCurrentConnections -> params_:\n', params_);
    //        console.log(params_.newData);  // Выводим в лог всю сущность
    //
    //        /*
    //        // Создание новой сделки при входяшем звонке
    //        await this._tickets.addNew(ticket_ => {
    //            ticket_.number = "123";
    //            ticket_.state = "new";
    //            ticket_.description = `Звонок: ${params_.entity?.sideA?.number} -> ${params_.entity?.sideB?.number}`;
    //        });
    //        */
    //
    //    }
    //    catch (e: any) {
    //        this.log.exception("afterInsertCurrentConnections", e);
    //    }
    //}


    //// Завершенный разговор
    //async afterInsertArchiveConnections(params_: IDataUpdateParams<IArchiveConnection>) {
    //    try {
    //        //console.log(`getNewCurrentConnectionsInsert: ${params_.updateKind} id=${params_.id}`);
    //        this.log.debug('afterInsertArchiveConnections -> params_:\n', params_);
    //        console.log(params_.newData);  // ...
    //
    //    }
    //    catch (e: any) {
    //        this.log.exception("afterInsertArchiveConnections", e);
    //    }
    //}


    //// Новый звонок
    //async afterInsertCurrentSeances(params_: IDataUpdateParams<ICurrentSeance>) {
    //    try {
    //        this.log.debug('afterInsertCurrentSeances -> params_:\n', params_);
    //        console.log(params_.newData);  // ...
    //
    //    }
    //    catch (e: any) {
    //        this.log.exception("afterInsertCurrentSeances", e);
    //    }
    //}


    // Новый звонок в очередь
    // (Для обновления incomingCalls.acdQueue_id)
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
            //this.log.debug('getRating_exec -> incomingCalls', incomingCalls);

            if (incomingCalls.length === 1) { // Должна быть только одна строка
                const incomingCall = incomingCalls[0];
                incomingCall.acdQueue = acdQueue;
            }
        }
        catch (e: any) {
            this.log.exception('afterInsertCurrentACDCalls', e);
        }
    };


    // Завершенный звонок
    // (Для обновления доп параметров по завершении звонка)
    async afterInsertArchiveSeances(params_: IDataUpdateParams<IArchiveSeance>) {
        this.log.debug('afterInsertArchiveSeances -> params_:\n', params_);
        //console.log(params_.newData);  // ...

        try {
            // Параметры
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
            const isDialogue = durationTalk > 0;

            // Обновление звонка
            const interval = FilterBuilder.fixInterval("full")
            const filter = FilterBuilder.equals("seanceId", seanceId);
            const incomingCallsTmp = new IncomingCalls(this.context);
            const incomingCalls = await incomingCallsTmp.loadAll({ select: { interval, filter } });
            //this.log.debug('getRating_exec -> incomingCalls', incomingCalls);

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
                //incomingCall.isDialogue = containsKind(JSON.parse(sidesB), 'user');
            }
        }
        catch (e: any) {
            this.log.exception("afterInsertArchiveSeances", e);
        }
    }


    /* ОТДЕЛЬНОЕ ПРИЛОЖЕНИЕ
    // Мониторинг добавления/обновления "ЧС"
    async afterUpdateBlacklists(params_: IDataUpdateParams<IBaseEntity>) {
        //this.log.debug('afterUpdateBlacklists -> params_:\n', params_);

        try {
            // Добавление или обновление
            if (params_.updateKind === EUpdateKind.Insert || params_.updateKind === EUpdateKind.Modify) {
                //this.log.debug('afterUpdateBlacklists, params_:', params_);

                // Параметры
                const modifierId = params_.modifier_id;
                const phone = params_.entity?.getValue('phone');

                // Данные сессии
                const session = DataFactory.sessionInfo;
                //this.log.debug('afterUpdateBlacklists -> sessionInfo:\n', session);

                // Ключа integration_point_id нет в явном виде, 
                // получаем значение через приведение к JSON
                const integrationPointId = JSON.parse(JSON.stringify(session)).integration_point_id;
                //this.log.debug('#integrationPointId: ', integrationPointId);

                if (modifierId !== integrationPointId) {
                    // При добавлении нового номера получаем insert, обновляем пользователя
                    // и получаем modify (который нужно игнорировать)
                    this.log.debug('afterUpdateBlacklists, params_:\n', params_);

                    // 1. Обновляем пользователя "ЧС"
                    //const user = await this._users.getByID(modifierId);
                    const user = await this.getUser(modifierId);

                    const blacklist = await this._blacklists.getByIDStrong(params_.id);
                    blacklist.user = user;

                    // 2. Проверяем и закрываем в "Рекомендовано для ЧС"
                    //await this.closeInRecommended(phone);
                    if (phone.trim().length > 0) { // Если есть номер
                        var filter = FilterBuilder.and(FilterBuilder.equals("phone", phone), FilterBuilder.equals("isAdded", false))
                        const recommendedBLs = await this._recommendedBLs.loadAll({ select: { filter } });
                        //this.log.debug('recommendedBLs', recommendedBLs);

                        if (recommendedBLs.length > 0) {
                            for (let recommendedBL_ of recommendedBLs) {
                                recommendedBL_.isAdded = true;
                            };
                        }
                    }
                }

            } // params_.updateKind

        }
        catch (e) {
            this.log.exception('afterUpdateBlacklists', e);
        }
    }
    */

    // ОТДЕЛЬНОЕ ПРИЛОЖЕНИЕ
    //// Мониторинг добавления/обновления "Рекомендовано для ЧС"
    //async afterUpdateRecommendedBls(params_: IDataUpdateParams<IBaseEntity>) {
    //    this.log.debug('afterUpdateRecommendedBls -> params_:\n', params_);
    //
    //    try {
    //        // Добавление И обновлене
    //        if (params_.updateKind === EUpdateKind.Insert || params_.updateKind === EUpdateKind.Modify) {
    //            //this.log.debug('afterUpdateRecommendedBls, params_:\n', params_);
    //
    //            // Параметры
    //            const modifierId = params_.modifier_id;
    //            const phone = params_.entity?.getValue('phone');
    //
    //            // Данные сессии
    //            const session = DataFactory.sessionInfo;
    //            //this.log.debug('sessionInfo: ', session);
    //
    //            // Ключа integration_point_id нет в явном виде,
    //            // получаем значение через приведение к JSON
    //            const integrationPointId = JSON.parse(JSON.stringify(session)).integration_point_id;
    //            this.log.debug('#integrationPointId: ', integrationPointId);
    //
    //            if (modifierId !== integrationPointId) {
    //                //this.log.debug('afterUpdateRecommendedBls, params_:\n', params_);
    //
    //                // 1. Обновление пользователя "ЧС"
    //                const user = await this.getUser(modifierId);
    //                const recommendedBLs = await this._recommendedBLs.getByIDStrong(params_.id);
    //                recommendedBLs.user = user;
    //
    //                // 2. Если номер уже в ЧС, то обновляем как обработанный
    //
    //                // 3. Проверка числа рекомендаций для добавления в ЧС
    //                // Пока не понял почему, но придобавлении через кнопку
    //                // Insert не приходил в данную процедуру
    //                //await this.checkAndAddToBlacklist(phone, modifierId)
    //
    //                /*
    //                // 3. Добавление в ЧС по превышению числа рекомендаций
    //                //var filter = FilterBuilder.equals('phone', phoneNumbers);
    //                var filter = FilterBuilder.and(FilterBuilder.equals("phone", phone), FilterBuilder.equals("isAdded", false))
    //                const recommendedBLs11 = await this._recommendedBLs.loadAll({ select: { filter } });
    //                //this.log.debug('recommendedBLs', recommendedBLs);
    //
    //
    //                // Проверяем число открытых рекомендаций
    //                if (recommendedBLs11.length >= 5) {
    //                    // ...
    //                    // Отдельная процедура
    //                    //(Кнопка "Добавить в ЧС" и ТУТ)
    //                    this.log.debug('afterUpdateRecommendedBls -> В ЧС ПО ЧИСЛУ РЕКОМЕНДАЦИЙ');
    //
    //                    await this.addToBlacklist(phone, modifierId, false)
    //                }
    //                */
    //            }
    //        }
    //    }
    //    catch (e) {
    //        this.log.exception('afterUpdateBlacklists', e);
    //    }
    //}


    /* ОТДЕЛЬНОЕ ПРИЛОЖЕНИЕ
    // Процедура -> получение пользователя
    async getUser(userId: string | undefined) {
        //this.log.debug('getUser -> userId: ', userId);

        try {
            let user: IRootUser | undefined = undefined

            // Ищем пользователя в БД, если он есть
            let filter = FilterBuilder.equals('id', userId);
            const users = await this._users.loadAll({ select: { filter } });
            if (users.length > 0) {
                user = users[0]
            }
            this.log.debug('getUser -> user:\n', user);

            return user;
        }
        catch (e) {
            this.log.exception('getUser ', e);
        }
    }
    */

    /* НЕ АКТУАЛЬНО
    // Процедура кнопки "Добавить в ЧС"
    async buttonAddToBlacklist(invocation_: IInvocation) {
        this.log.debug('buttonAddToBlacklist -> invocation_', invocation_);

        try {
            const phone = invocation_.request?.phone;
            const user_id = invocation_.request?.user;

            // Добавляем номер телефона в ЧС
            await this.addToBlacklist(phone, user_id, true)
            //this.log.debug('buttonAddToBlacklist -> invocation_', '### END');

            return true;
        }
        catch (e) {
            this.log.exception('buttonAddToBlacklist', e);

            return false;
        }
    }
    */

    /* НЕ АКТУАЛЬНО
    // Процедура кнопки "Рекомендовать для ЧС"
    async buttonAddToRecommendedBlacklist(invocation_: IInvocation) {
        this.log.debug('buttonAddToRecommendedBlacklist -> invocation_', invocation_);

        try {
            const phone = invocation_.request?.phone;
            const user_id = invocation_.request?.user;

            this.log.debug('phone', phone);
            this.log.debug('user_id', user_id);

            // Добавляем в "Рекомендовано для ЧС"
            await this.addToRecommendedBlacklist(phone, user_id)
            //this.log.debug('buttonAddToBlacklist -> invocation_', '### END');

            // 2. Пверка числа рекомендаций для обавления в ЧС
            await this.checkAndAddToBlacklist(phone, user_id)

            return true;
        }
        catch (e) {
            this.log.exception('buttonAddToRecommendedBlacklist', e);

            return false;
        }
    }
    */

    /*
    // Проедура обновления пользователя в ЧС
    async updateUserInBlacklist(phone: string) {
        this.log.debug('updateUserInBlacklist -> phone', phone);

        try {
            if (phone.trim().length > 0) {
                // Если есть номер телефона
                // Проверяем и закрываем его как обработанный в "Рекомендовано для ЧС"
                var filter = FilterBuilder.and(FilterBuilder.equals("phone", phone), FilterBuilder.equals("isAdded", false))
                const recommendedBLs = await this._recommendedBLs.loadAll({ select: { filter } });

                if (recommendedBLs.length > 0) {
                    // ...
                    for (let recommendedBL_ of recommendedBLs) {
                        recommendedBL_.isAdded = true;
                    };
                }
            }
        }
        catch (e) {
            this.log.exception('closeInRecommended', e);
        }
    }
    */

    /* НЕ АКТУАЛЬНО
    // Проедура помечает "Рекомендованые для ЧС" как обработанные
    async closeInRecommended(phone: string) {
        this.log.debug('closeInRecommended -> phone', phone);

        try {
            if (phone.trim().length > 0) { // Если есть номер
                var filter = FilterBuilder.and(FilterBuilder.equals("phone", phone), FilterBuilder.equals("isAdded", false))
                const recommendedBLs = await this._recommendedBLs.loadAll({ select: { filter } });
                //this.log.debug('recommendedBLs', recommendedBLs);

                // Помечаем как обработанный
                if (recommendedBLs.length > 0) {
                    for (let recommendedBL_ of recommendedBLs) {
                        recommendedBL_.isAdded = true;
                    };
                }
            }
        }
        catch (e) {
            this.log.exception('closeInRecommended', e);
        }
    }
    */

    /* НЕ АКТУАЛЬНО
    // Проедура проверки числа рекомендаций 
    // и добавления нового номера в "ЧС" по его превышению
    async checkAndAddToBlacklist(phone: string, user_id: string | undefined) {
        this.log.debug('checkAndAddToBlacklist -> phone', phone);

        try {
            // 2. Добавление в ЧС по превышению числа рекомендаций
            //var filter = FilterBuilder.equals('phone', phoneNumbers);
            var filter = FilterBuilder.and(FilterBuilder.equals("phone", phone), FilterBuilder.equals("isAdded", false))
            const recommendedBLs = await this._recommendedBLs.loadAll({ select: { filter } });
            //this.log.debug('recommendedBLs', recommendedBLs);

            // Проверяем число открытых рекомендаций
            if (recommendedBLs.length >= 5) {
                // ...
                // Отдельная процедура
                //(Кнопка "Добавить в ЧС" и ТУТ)
                this.log.debug('afterUpdateRecommendedBls -> В ЧС ПО ЧИСЛУ РЕКОМЕНДАЦИЙ');

                await this.addToBlacklist(phone, user_id, false)
            };
        }
        catch (e) {
            this.log.exception('addToBlacklist', e);
        }
    }
    */

    /* НЕ АКТУАЛЬНО
    // Проедура добавления нового номера в "ЧС"
    async addToBlacklist(phone: string, user_id: string | undefined, isPermanent: boolean) {
        this.log.debug('addToBlacklist -> phone', phone);

        try {
            if (phone.trim().length > 0) { // Если есть номер телефона
                //this.log.debug('buttonAddToBlacklist_execute -> invocation_', '### Прошел проверку номера');

                // Проверка на наличие номера в ЧС
                var filter = FilterBuilder.equals('phone', phone);
                const blacklists = await this._blacklists.loadAll({ select: { filter } });
                //this.log.debug('blacklists', blacklists);

                if (blacklists.length === 0) { // Если номера НЕТ в ЧС
                    //console.log("Список пустой");

                    // Пользователь
                    var filter = FilterBuilder.equals('id', user_id);
                    const users = await this._users.loadAll({ select: { filter } });

                    // Тип ЧС по умолчанию general, ДОЛЖЕН быть предварительно создан
                    // (чтобы гарантированно был тип ЧС, можно выделить отдельный тип "Дбавленные через кнопку"
                    // с проверкой и созданием его если не найден)
                    var filter = FilterBuilder.equals('code', 'general');
                    const blacklistTypes = await this._blacklistTypes.loadAll({ select: { filter } });

                    // Добавление в ЧС
                    await this._blacklists.addNew(blacklist_ => {
                        blacklist_.dttmInsert = new Date();
                        blacklist_.type = blacklistTypes[0] //getFirstItemOrUndefined(blacklistTypes);
                        blacklist_.phone = phone;
                        blacklist_.isPermanent = isPermanent;
                        blacklist_.user = getFirstItemOrUndefined(users);
                    });
                    //this.log.debug('blacklistTypes', blacklistTypes);
                }
                // Закрываем в "Рекомендованно для ЧС"
                await this.closeInRecommended(phone);
            }
        }
        catch (e) {
            this.log.exception('addToBlacklist', e);
        }
    }
    */

    /* НЕ АКТУАЛЬНО
    // Процедура удаления номера телефона из "ЧС"
    async deleteTempPhonesFromBlacklist() {
        this.log.debug('deleteTempPhonesFromBlacklist');

        const toDelete: IBlackList[] = [];

        try {
            //const intervalDttm = new Date(date);
            //this.log.debug('deleteTempPhonesFromBlacklist -> intervalDttm: ', intervalDttm);

            let from = new Date(1900, 1, 1);
            let to = new Date();  // to = new Date(2100, 1, 1);
            to.setDate(to.getDate() - 1);  // Вычитаем 1 день
            //to.setTime(to.getTime() - (1 * 60 * 60 * 1000)); // Вычитаем 1 час

            const interval = [Converter.toDateTimeString(from), Converter.toDateTimeString(to)];
            var filter = FilterBuilder.equals('isPermanent', false);
            this.log.debug('interval: ', interval);

            //var filter = FilterBuilder.and(["<=", ["property", "dttmInsert"], ["const", to]], ["===", ["property", "isPermanent"], ["const", false]])
            //this.log.debug('interval: ', filter);
            // ...
            //var blacklists = await this._blacklists.loadAll({ select: { interval, filter } });
            var blacklists = await this._blacklists.loadAll({ select: { filter } });
            this.log.debug('blacklists: ', blacklists);

            for (let blacklist_ of blacklists) {

                // Доп. сравнение времени, поскольку в фильтре не учитывается часовой пояс
                // (причину пока не понял)
                if (blacklist_.dttmInsert < to) {
                    toDelete.push(blacklist_);
                }
            }
            //this.log.debug('toDelete: ', toDelete);
            this.log.debug('\n-----');

            //await this._blacklists.deleteByID



        }
        catch (e) {
            this.log.exception('deleteTempPhonesFromBlacklist', e);
        }
    }
    */


    /* НЕ АКТУАЛЬНО
    // Проедура добавления нового номера в "Рекомендовано для ЧС"
    async addToRecommendedBlacklist(phone: string, user_id: string | undefined) {
        this.log.debug('addToRecommendedBlacklist -> phone', phone);

        try {
            if (phone.trim().length > 0) { // Если есть номер телефона
                //this.log.debug('addToRecommendedBlacklist -> invocation_', '### Прошел проверку номера');

                // Пользователь
                var filter = FilterBuilder.equals('id', user_id);
                const users = await this._users.loadAll({ select: { filter } });

                // Добавление в "Рекомендовано для ЧС"
                await this._recommendedBLs.addNew(recommendedBLs_ => {
                    recommendedBLs_.dttmInsert = new Date();
                    recommendedBLs_.phone = phone;
                    recommendedBLs_.user = getFirstItemOrUndefined(users);
                    recommendedBLs_.isAdded = false
                });

            }
        }
        catch (e) {
            this.log.exception('addToRecommendedBlacklist', e);
        }
    }
    */


    //Поцедура -> 
    // поверка признаков "ЧС" и "Рабочее время"
    // сохранение нового звонка для отчетности
    // возврат признаков "ЧС" и "Рабочее время" 
    async incomingCall_exec(invocation_: IInvocation) {
        this.log.debug('incomingCall_exec -> invocation_', invocation_);

        try {
            // Параметры
            const toStringSafe = (value: any): string => value?.toString() ?? '';
            const seanceId = toStringSafe(invocation_.request?.seanceId);
            const callId = toStringSafe(invocation_.request?.callId);
            const calledId = toStringSafe(invocation_.request?.calledId);
            const callerId = toStringSafe(invocation_.request?.callerId);

            // 1. Рабочий график платформы
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
                    this.log.debug('getIncomingCallExec -> Ошибка проверки Графика работы: ', schedule);
                }
            };

            // 2. Проверка по ЧС
            const params = JSON.stringify({ phone: callerId });
            const blacklist = await this.invoke('blacklist.MainService', 'checkPhoneByBlacklist_exec', params);
            //{"state":"success","response":{"result":false}}

            let isBlacklist = false
            if (blacklist.state === 'success') {
                if (blacklist.response?.result) {
                    isBlacklist = true;
                }
            }
            else {
                // Добавить преобразовние blacklist
                //const errorMessage = `incomingCall_exec -> Ошибка проверки ЧС: ${JSON.stringify(blacklist)}`;
                this.log.debug('incomingCall_exec -> Ошибка проверки ЧС: ', blacklist);
            }
            //this.log.debug('blacklist: ', blacklist);

            // 3. Сохранение звонка
            // Через локальнцю переменую ошибка записи Entities ... are not ready ...
            // Запись сработала только через объявление как this.
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


    //Поцедура -> сохранение оценок качества обслуживания
    async rating_exec(invocation_: IInvocation) {
        this.log.debug('rating_exec -> invocation_', invocation_);

        try {
            // Параметры
            const { request } = invocation_;
            const seanceId: string = request?.seanceId?.toString() ?? '';
            const { timeRating = 0, clarityRating = 0, friendlinessRating = 0, competenceRating = 0 } = request?.ratings ?? {};

            // Общая оценка
            const ratings: number[] = [timeRating, clarityRating, friendlinessRating, competenceRating];
            // Берем минимальную исключая 0
            const overallRating = Math.min(...ratings.filter(num => num !== 0));

            // Обновление оценки
            const interval = FilterBuilder.fixInterval("full")
            const filter = FilterBuilder.equals("seanceId", seanceId);

            const incomingCallsTmp = new IncomingCalls(this.context);
            const incomingCalls = await incomingCallsTmp.loadAll({ select: { interval, filter } });
            //this.log.debug('getRating_exec -> incomingCalls', incomingCalls);

            if (incomingCalls.length === 1) { // Должна быть только одна строка
                incomingCalls[0].isRating = true;
                if (timeRating) { incomingCalls[0].timeRating = timeRating; }
                if (clarityRating) { incomingCalls[0].clarityRating = clarityRating; }
                if (friendlinessRating) { incomingCalls[0].friendlinessRating = friendlinessRating; }
                if (competenceRating) { incomingCalls[0].competenceRating = competenceRating; }
                if (overallRating) { incomingCalls[0].overallRating = overallRating; }
            }

            // 4. Возврат результата
            return { result: true };
        }
        catch (e) {
            this.log.exception('rating_exec -> exception', e);
            return false;
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

            /*
            const filter = [
                "and",
                [
                    "or",
                    [
                        "isnull",
                        [
                            "parameter",
                            isBlacklist
                        ]
                    ],
                    [
                        "==",
                        [
                            "property",
                            "isBlacklist"
                        ],
                        [
                            "bool",
                            [
                                "parameter",
                                isBlacklist
                            ]
                        ]
                    ]
                ]
            ];
            */
            //this.log.debug('getReportIncomingCalls -> interval', interval);
            //this.log.debug('getReportIncomingCalls -> filter', filter);


            //const filter = FilterBuilder.equals("isBlacklist", stringToBoolean(isBlacklist));
            /*
            const filter = FilterBuilder.and([
                "or",
                [
                    "isnull",
                    [
                        "parameter",
                        isBlacklist
                    ]
                ],
                [
                    "==",
                    [
                        "property",
                        "isBlacklist"
                    ],
                    [
                        "bool",
                        [
                            "parameter",
                            isBlacklist
                        ]
                    ]
                ]
            ])
            */
            //const filter = FilterBuilder.or(FilterBuilder.isnull(isBlacklist), ["==", ["property", "isBlacklist"], ["bool", ["parameter", isBlacklist]]])
            //!//const filter = FilterBuilder.or(["isnull", ["parameter", isBlacklist]], ["==", ["property", "isBlacklist"], ["const", isBlacklist]])
            //const filter = FilterBuilder.and(FilterBuilder.or(FilterBuilder.isnull(isBlacklist), FilterBuilder.equals("isBlacklist", ["const", isBlacklist])))

            //this.log.debug('getReportIncomingCalls -> interval', interval);
            //this.log.debug('getReportIncomingCalls -> filter', filter);


            // Пришел к использованию отдельных минифильтров под каждый фильтр
            // const isBlacklistFilter = ["or", ["isnull", ["const", "isBlacklist"]], ["==", ["property", "isBlacklist"], ["bool", ["const", isBlacklist]]]]

            const isBlacklistFilter = FilterBuilder.equals("isBlacklist", ["const", isBlacklist]);

            //const filter = FilterBuilder.and(FilterBuilder.or(FilterBuilder.isnull(isBlacklist), isBlacklistFilter))
            //const filter = FilterBuilder.and(FilterBuilder.or(FilterBuilder.emptyOrEquals("isBlacklist", "isBlacklist"), isBlacklistFilter));
            //this.log.debug('getReportIncomingCalls -> interval', interval);
            //this.log.debug('getReportIncomingCalls -> filter', filter);

            let selectFilter: any

            if (isBlacklist !== null && isBlacklist !== undefined) {
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
            // Формируем фильтр для выборки данных
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
