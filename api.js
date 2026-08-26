import { seg, apiError, authLogin, authMe, editionsList, editionsCreate, editionsUpdate, editionsDuplicate, editionsCompare } from './apiHandlers';
import * as CAT_PART_ROOMS from './apiParticipantsRooms';
import * as FIN from './apiFinancial';
import * as GYM from './apiGymkhana';
import { dashboardGet, historyList } from './apiDashboardHistory';
import { usersList, usersCreate, usersUpdate, rolesList, rolesCreate, rolesUpdate, rolesDelete } from './apiUsers';
import { eventTypesList, eventTypesCreate, eventTypesUpdate, eventsList, eventGet, eventsCreate, eventsUpdate, eventsDelete } from './apiEvents';
import { areasList, areasCreate, peopleList, peopleCreate, peopleUpdate, peopleDelete } from './apiTeam';
import { generalDashboardGet } from './apiGeneralDashboard';
import {
  checklistsList, checklistGet, checklistsCreate, checklistsUpdate, checklistsDelete,
  sectionsCreate, sectionsDelete, itemsCreate as checklistItemsCreate, itemsUpdate as checklistItemsUpdate, itemsDelete as checklistItemsDelete,
} from './apiChecklists';
import {
  locationsList, locationsCreate, locationsDelete,
  itemsList as inventoryItemsList, itemsGet as inventoryItemGet, itemsCreate as inventoryItemsCreate,
  itemsUpdate as inventoryItemsUpdate, itemsDelete as inventoryItemsDelete,
  movementsCreate as inventoryMovementsCreate, inventorySummary, movementsByEvent as inventoryMovementsByEvent,
} from './apiInventory';
import { plansList, plansCreate, installmentMarkPaid, installmentsSummary } from './apiInstallments';
import { cashSummary, depositsList, depositsCreate } from './apiCashRegister';
import { annualReport } from './apiReports';
import { getBranding, updateBranding } from './apiBranding';

const { categoriesList, categoriesCreate, categoriesUpdate,
  participantsList, participantsSummary, participantsCreate, participantsUpdate, participantsDelete,
  roomsList, roomsCreate, roomsUpdate, roomsDelete, roomsAssign, roomsUnassign } = CAT_PART_ROOMS;

const { movementsList, movementsCreate, movementsUpdate, movementsDelete, movementsListAll,
  fundraisersList, fundraisersListAll, fundraisersCreate, fundraisersUpdate, fundraisersIntegrate, fundraisersDelete,
  shoppingList, shoppingListAll, shoppingCreate, shoppingUpdate, shoppingMarkPurchased, shoppingDelete,
  scheduleList, scheduleCreate, scheduleUpdate, scheduleDelete } = FIN;

const { teamsList, teamsCreate, teamsUpdate, teamsDelete, teamsAddMember,
  gamesList, gamesCreate, gamesDelete, gamesScore, ranking } = GYM;

async function handle(method, path, { params = {}, data } = {}) {
  const s = seg(path);

  // -------- AUTH --------
  if (method === 'POST' && s[0] === 'auth' && s[1] === 'login') return authLogin(data);
  if (method === 'GET' && s[0] === 'auth' && s[1] === 'me') return authMe();

  // -------- EDITIONS --------
  if (method === 'GET' && s[0] === 'editions' && s.length === 1) return editionsList();
  if (method === 'POST' && s[0] === 'editions' && s[1] === 'compare') return editionsCompare(data);
  if (method === 'POST' && s[0] === 'editions' && s.length === 1) return editionsCreate(data);
  if (method === 'PUT' && s[0] === 'editions' && s.length === 2) return editionsUpdate(s[1], data);
  if (method === 'POST' && s[0] === 'editions' && s.length === 3 && s[2] === 'duplicate') return editionsDuplicate(s[1], data);

  // -------- CATEGORIES --------
  if (method === 'GET' && s[0] === 'categories' && s.length === 1) return categoriesList(params);
  if (method === 'POST' && s[0] === 'categories' && s.length === 1) return categoriesCreate(data);
  if (method === 'PUT' && s[0] === 'categories' && s.length === 2) return categoriesUpdate(s[1], data);

  // -------- PARTICIPANTS --------
  if (method === 'GET' && s[0] === 'participants' && s[1] === 'summary') return participantsSummary(params);
  if (method === 'GET' && s[0] === 'participants' && s.length === 1) return participantsList(params);
  if (method === 'POST' && s[0] === 'participants' && s.length === 1) return participantsCreate(data);
  if (method === 'PUT' && s[0] === 'participants' && s.length === 2) return participantsUpdate(s[1], data);
  if (method === 'DELETE' && s[0] === 'participants' && s.length === 2) return participantsDelete(s[1]);

  // -------- ROOMS --------
  if (method === 'GET' && s[0] === 'rooms' && s.length === 1) return roomsList(params);
  if (method === 'POST' && s[0] === 'rooms' && s.length === 1) return roomsCreate(data);
  if (method === 'PUT' && s[0] === 'rooms' && s.length === 2) return roomsUpdate(s[1], data);
  if (method === 'DELETE' && s[0] === 'rooms' && s.length === 2) return roomsDelete(s[1]);
  if (method === 'POST' && s[0] === 'rooms' && s[2] === 'assign') return roomsAssign(s[1], data);
  if (method === 'POST' && s[0] === 'rooms' && s[1] === 'unassign') return roomsUnassign(s[2]);

  // -------- FINANCIAL --------
  if (method === 'GET' && s[0] === 'financial' && s[1] === 'all') return movementsListAll(s[2] === 'expenses' ? 'expenses' : 'incomes', params);
  if (s[0] === 'financial' && (s[1] === 'incomes' || s[1] === 'expenses')) {
    const collName = s[1] === 'incomes' ? 'incomes' : 'expenses';
    if (method === 'GET' && s.length === 2) return movementsList(collName, params);
    if (method === 'POST' && s.length === 2) return movementsCreate(collName, data);
    if (method === 'PUT' && s.length === 3) return movementsUpdate(collName, s[2], data);
    if (method === 'DELETE' && s.length === 3) return movementsDelete(collName, s[2]);
  }

  // -------- FUNDRAISERS --------
  if (method === 'GET' && s[0] === 'fundraisers' && s[1] === 'all') return fundraisersListAll();
  if (method === 'GET' && s[0] === 'fundraisers' && s.length === 1) return fundraisersList(params);
  if (method === 'POST' && s[0] === 'fundraisers' && s.length === 1) return fundraisersCreate(data);
  if (method === 'PUT' && s[0] === 'fundraisers' && s.length === 2) return fundraisersUpdate(s[1], data);
  if (method === 'POST' && s[0] === 'fundraisers' && s[2] === 'integrate') return fundraisersIntegrate(s[1]);
  if (method === 'DELETE' && s[0] === 'fundraisers' && s.length === 2) return fundraisersDelete(s[1]);

  // -------- SHOPPING --------
  if (method === 'GET' && s[0] === 'shopping' && s[1] === 'all') return shoppingListAll();
  if (method === 'GET' && s[0] === 'shopping' && s.length === 1) return shoppingList(params);
  if (method === 'POST' && s[0] === 'shopping' && s.length === 1) return shoppingCreate(data);
  if (method === 'PUT' && s[0] === 'shopping' && s.length === 2) return shoppingUpdate(s[1], data);
  if (method === 'POST' && s[0] === 'shopping' && s[2] === 'mark-purchased') return shoppingMarkPurchased(s[1], data);
  if (method === 'DELETE' && s[0] === 'shopping' && s.length === 2) return shoppingDelete(s[1]);

  // -------- SCHEDULE --------
  if (method === 'GET' && s[0] === 'schedule' && s.length === 1) return scheduleList(params);
  if (method === 'POST' && s[0] === 'schedule' && s.length === 1) return scheduleCreate(data);
  if (method === 'PUT' && s[0] === 'schedule' && s.length === 2) return scheduleUpdate(s[1], data);
  if (method === 'DELETE' && s[0] === 'schedule' && s.length === 2) return scheduleDelete(s[1]);

  // -------- GYMKHANA --------
  if (s[0] === 'gymkhana') {
    if (method === 'GET' && s[1] === 'teams' && s.length === 2) return teamsList(params);
    if (method === 'POST' && s[1] === 'teams' && s.length === 2) return teamsCreate(data);
    if (method === 'PUT' && s[1] === 'teams' && s.length === 3) return teamsUpdate(s[2], data);
    if (method === 'DELETE' && s[1] === 'teams' && s.length === 3) return teamsDelete(s[2]);
    if (method === 'POST' && s[1] === 'teams' && s[3] === 'members') return teamsAddMember(s[2], data);
    if (method === 'GET' && s[1] === 'games' && s.length === 2) return gamesList(params);
    if (method === 'POST' && s[1] === 'games' && s.length === 2) return gamesCreate(data);
    if (method === 'DELETE' && s[1] === 'games' && s.length === 3) return gamesDelete(s[2]);
    if (method === 'POST' && s[1] === 'games' && s[3] === 'score') return gamesScore(s[2], data);
    if (method === 'GET' && s[1] === 'ranking') return ranking(params);
  }

  // -------- DASHBOARD (retiro específico) --------
  if (method === 'GET' && s[0] === 'dashboard' && s.length === 2) return dashboardGet(s[1]);

  // -------- DASHBOARD GERAL --------
  if (method === 'GET' && s[0] === 'general-dashboard') return generalDashboardGet();

  // -------- EVENTOS --------
  if (s[0] === 'events') {
    if (method === 'GET' && s[1] === 'types') return eventTypesList();
    if (method === 'POST' && s[1] === 'types') return eventTypesCreate(data);
    if (method === 'PUT' && s[1] === 'types') return eventTypesUpdate(s[2], data);
    if (method === 'GET' && s.length === 1) return eventsList();
    if (method === 'GET' && s.length === 2) return eventGet(s[1]);
    if (method === 'POST' && s.length === 1) return eventsCreate(data);
    if (method === 'PUT' && s.length === 2) return eventsUpdate(s[1], data);
    if (method === 'DELETE' && s.length === 2) return eventsDelete(s[1]);
  }

  // -------- EQUIPE E RESPONSÁVEIS --------
  if (s[0] === 'team') {
    if (method === 'GET' && s[1] === 'areas') return areasList();
    if (method === 'POST' && s[1] === 'areas') return areasCreate(data);
    if (method === 'GET' && s[1] === 'people') return peopleList();
    if (method === 'POST' && s[1] === 'people') return peopleCreate(data);
    if (method === 'PUT' && s[1] === 'people') return peopleUpdate(s[2], data);
    if (method === 'DELETE' && s[1] === 'people') return peopleDelete(s[2]);
  }

  // -------- HISTORY --------
  if (method === 'GET' && s[0] === 'history') return historyList(params);

  // -------- CHECKLISTS --------
  if (s[0] === 'checklists') {
    if (method === 'GET' && s.length === 1) return checklistsList();
    if (method === 'GET' && s.length === 2) return checklistGet(s[1]);
    if (method === 'POST' && s.length === 1) return checklistsCreate(data);
    if (method === 'PUT' && s.length === 2) return checklistsUpdate(s[1], data);
    if (method === 'DELETE' && s.length === 2) return checklistsDelete(s[1]);
    if (method === 'POST' && s[1] === 'sections') return sectionsCreate(data);
    if (method === 'DELETE' && s[1] === 'sections') return sectionsDelete(s[2]);
    if (method === 'POST' && s[1] === 'items') return checklistItemsCreate(data);
    if (method === 'PUT' && s[1] === 'items') return checklistItemsUpdate(s[2], data);
    if (method === 'DELETE' && s[1] === 'items') return checklistItemsDelete(s[2]);
  }

  // -------- ESTOQUE --------
  if (s[0] === 'inventory') {
    if (method === 'GET' && s[1] === 'summary') return inventorySummary();
    if (method === 'GET' && s[1] === 'locations') return locationsList();
    if (method === 'POST' && s[1] === 'locations') return locationsCreate(data);
    if (method === 'DELETE' && s[1] === 'locations') return locationsDelete(s[2]);
    if (method === 'GET' && s[1] === 'items' && s.length === 2) return inventoryItemsList(params);
    if (method === 'GET' && s[1] === 'items' && s.length === 3) return inventoryItemGet(s[2]);
    if (method === 'POST' && s[1] === 'items') return inventoryItemsCreate(data);
    if (method === 'PUT' && s[1] === 'items') return inventoryItemsUpdate(s[2], data);
    if (method === 'DELETE' && s[1] === 'items') return inventoryItemsDelete(s[2]);
    if (method === 'GET' && s[1] === 'movements') return inventoryMovementsByEvent(params.evento_id);
    if (method === 'POST' && s[1] === 'movements') return inventoryMovementsCreate(data);
  }

  // -------- PARCELAMENTOS --------
  if (s[0] === 'installments') {
    if (method === 'GET' && s[1] === 'plans') return plansList();
    if (method === 'POST' && s[1] === 'plans') return plansCreate(data);
    if (method === 'GET' && s[1] === 'summary') return installmentsSummary();
    if (method === 'POST' && s.length === 3 && s[2] === 'pay') return installmentMarkPaid(s[1], data);
  }

  // -------- CAIXA EM ESPÉCIE --------
  if (s[0] === 'cash') {
    if (method === 'GET' && s[1] === 'summary') return cashSummary();
    if (method === 'GET' && s[1] === 'deposits') return depositsList();
    if (method === 'POST' && s[1] === 'deposits') return depositsCreate(data);
  }

  // -------- RELATÓRIO ANUAL --------
  if (method === 'GET' && s[0] === 'reports' && s[1] === 'annual') return annualReport(params.year);

  // -------- APARÊNCIA / IDENTIDADE VISUAL --------
  if (method === 'GET' && s[0] === 'settings' && s[1] === 'branding') return getBranding();
  if (method === 'PUT' && s[0] === 'settings' && s[1] === 'branding') return updateBranding(data);

  // -------- USERS --------
  if (method === 'GET' && s[0] === 'users' && s[1] === 'roles' && s[2] === 'list') return rolesList();
  if (method === 'POST' && s[0] === 'users' && s[1] === 'roles' && s.length === 2) return rolesCreate(data);
  if (method === 'PUT' && s[0] === 'users' && s[1] === 'roles' && s.length === 3) return rolesUpdate(s[2], data);
  if (method === 'DELETE' && s[0] === 'users' && s[1] === 'roles' && s.length === 3) return rolesDelete(s[2]);
  if (method === 'GET' && s[0] === 'users' && s.length === 1) return usersList();
  if (method === 'POST' && s[0] === 'users' && s.length === 1) return usersCreate(data);
  if (method === 'PUT' && s[0] === 'users' && s.length === 2) return usersUpdate(s[1], data);

  throw apiError(`Rota não implementada: ${method} ${path}`, 404);
}

const api = {
  async get(path, config) {
    const result = await handle('GET', path, { params: config?.params });
    return { data: result };
  },
  async post(path, data) {
    const result = await handle('POST', path, { data });
    return { data: result };
  },
  async put(path, data) {
    const result = await handle('PUT', path, { data });
    return { data: result };
  },
  async delete(path) {
    const result = await handle('DELETE', path, {});
    return { data: result };
  },
};

export default api;

export function money(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d.length <= 10 ? d + 'T00:00:00' : d);
    return dt.toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
}

export function formatDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
