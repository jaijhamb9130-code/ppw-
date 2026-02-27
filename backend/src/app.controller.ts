import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { TallyService } from './tally.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Ledger } from './entities/ledger.entity';
import { Repository } from 'typeorm';
import { StockItem } from './entities/stock-item.entity';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly tallyService: TallyService,
    @InjectRepository(Ledger)
    private ledgerRepo: Repository<Ledger>,
    @InjectRepository(StockItem)
    private stockRepo: Repository<StockItem>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderDetail)
    private orderDetailRepo: Repository<OrderDetail>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('auth/login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(
      body.username,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    // Return JWT token
    return this.authService.login(user);
  }

  @Post('auth/register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('ledgers')
  async createLedger(@Body() body: any) {
    if (!body.name) throw new Error('Name is required');

    // Advanced Duplicate Check: (Name + Phone) OR (GSTIN)
    let existingLedger: Ledger | null = null;

    if (body.gstin) {
      existingLedger = await this.ledgerRepo.findOne({
        where: { gstin: body.gstin },
      });
    }

    if (!existingLedger && body.name && body.phone_number) {
      existingLedger = await this.ledgerRepo.findOne({
        where: {
          name: body.name,
          phone_number: body.phone_number,
        },
      });
    }

    // Fallback: Check just name if no other unique identifier provided (optional, but requested by user)
    // "name and mobile will be the one by which we can differentiate" -> implies specific combo?
    // User said: "if not in tally and serve".
    // Let's stick to strict: Name+Mobile OR GSTIN.
    // If only Name is provided and duplicates exist, system might create duplicate?
    // User previous request: "check duplicate name". Let's keep name check as last resort backup to prevent simple spam.
    if (!existingLedger) {
      existingLedger = await this.ledgerRepo.findOne({
        where: { name: body.name },
      });
    }

    if (existingLedger) {
      return existingLedger;
    }

    const ledger = new Ledger();
    ledger.name = body.name;
    ledger.address = body.address;
    ledger.person_name = body.person_name;
    ledger.phone_number = body.phone_number;
    ledger.email = body.email;
    ledger.gstin = body.gstin;
    ledger.pincode = body.pincode;
    ledger.state = body.state;
    return this.ledgerRepo.save(ledger);
  }

  @Post('orders')
  async createOrder(@Body() body: any) {
    const {
      bill_number,
      ledger_id,
      date,
      total_amount,
      items,
      created_by,
      order_type,
      remark,
    } = body;

    const ledger = await this.ledgerRepo.findOneBy({ id: ledger_id });
    if (!ledger) {
      throw new Error('Ledger not found');
    }

    if (bill_number) {
      const existingOrder = await this.orderRepo.findOne({
        where: { bill_number },
      });
      if (existingOrder) {
        throw new Error(
          `Order with Bill Number '${bill_number}' already exists.`,
        );
      }
    }

    const order = new Order();
    // Allow null bill_number, user might enter it later via Tally or manually
    order.bill_number = bill_number || null;
    order.ledger = ledger;
    order.date = date;
    order.total_amount = total_amount;
    order.order_type = order_type || 'Tax Invoice';
    order.remark = remark;

    // Snapshot customer details
    if (ledger) {
      order.customer_name = ledger.person_name || ledger.name;
      order.customer_address = ledger.address;
      order.customer_phone = ledger.phone_number;
      order.customer_email = ledger.email;
      order.customer_gstin = ledger.gstin;
      order.customer_pincode = ledger.pincode;
      order.customer_state = ledger.state;
    }

    // Set created_by if provided
    if (created_by) {
      order.created_by = created_by;
    }

    const savedOrder = await this.orderRepo.save(order);

    for (const item of items) {
      const orderDetail = new OrderDetail();
      orderDetail.order = savedOrder;
      const stockItem = await this.stockRepo.findOneBy({
        masterid: item.stock_item_id,
      });
      if (!stockItem) continue; // Skip or handle error

      orderDetail.stock_item_id = stockItem.masterid;
      orderDetail.item_name = stockItem.name;
      orderDetail.barcode = item.barcode;
      orderDetail.rate = item.rate;
      orderDetail.unit = item.unit;
      orderDetail.quantity = item.quantity;
      orderDetail.amount = item.amount;
      orderDetail.gst = item.gst;
      orderDetail.selected_scheme = item.selected_scheme;
      orderDetail.discount_percentage = item.selected_discount;
      orderDetail.livestock_type = item.livestock_type;
      await this.orderDetailRepo.save(orderDetail);
    }

    return savedOrder;
  }

  @Get('stock-items/barcode/:barcode')
  async getItemByBarcode(@Param('barcode') barcode: string) {
    if (!barcode) return null;

    // Use fuzzy search for barcode too, as requested
    const cleanSearch = barcode.replace(/[^a-zA-Z0-9]/g, '');
    const cleanBarcode = this.cleanSql('stock.ats_barcode');

    // Also try exact match first for performance/accuracy preference?
    // Actually, clean logic is safer for "19330" -> "(193) 30"

    const item = await this.stockRepo
      .createQueryBuilder('stock')
      .where(
        `(stock.ats_barcode = :barcode OR ${cleanBarcode} = :cleanSearch) AND stock.is_active = true`,
        { barcode, cleanSearch },
      )
      .getOne();

    return item;
  }

  @Get('stock-items/:masterid/live-stock')
  async getLiveStock(@Param('masterid') masterid: string) {
    const stockItem = await this.stockRepo.findOneBy({ masterid });
    if (!stockItem) return { shop: '0.00', pb: '0.00' };

    const collection = await this.tallyService.fetchItemGodownStock(
      stockItem.name,
    );

    let shopQty = 0;
    let pbQty = 0;

    for (const entry of collection) {
      // Use specific keys provided by user: godownname and stkclbalance
      const godownName = (
        this.tallyService.getValue(entry.godownname) ||
        this.tallyService.getValue(entry.name) ||
        ''
      ).toLowerCase();
      const closingBal =
        parseFloat(this.tallyService.getValue(entry.stkclbalance)) ||
        parseFloat(this.tallyService.getValue(entry.closingbalance)) ||
        0;

      if (godownName.includes('shop')) {
        shopQty += closingBal;
      } else if (
        godownName.includes('pb') ||
        godownName.includes('p.b') ||
        godownName.includes('panbazar')
      ) {
        pbQty += closingBal;
      }
    }

    return {
      shop: shopQty.toFixed(2),
      pb: pbQty.toFixed(2),
      unit: stockItem.base_units || 'Pcs',
    };
  }

  // Separate sync endpoints
  @Post('sync/ledgers')
  async syncLedgers() {
    return this.tallyService.fetchAndSaveLedgers();
  }

  @Post('sync/stock-items')
  async syncStockItems() {
    return this.tallyService.fetchAndSaveStockItems();
  }

  @Get('version')
  getVersion() {
    return {
      version: '1.2.2',
      status: 'Running',
      stripped_chars: [
        ' ',
        '-',
        '.',
        '/',
        '(',
        ')',
        '[',
        ']',
        '_',
        '{',
        '}',
        '&',
        '@',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // Combined sync (legacy)
  @Post('sync')
  async syncData() {
    try {
      return await this.tallyService.syncAll();
    } catch (error) {
      console.error('Error in syncData:', error);
      throw error;
    }
  }

  // Helper to generate nested REPLACE SQL
  private cleanSql(column: string): string {
    // List of characters to strip: special symbols + whitespace
    // Removed '?' and ':' to avoid TypeORM parameter parsing issues
    const chars = [
      ' ',
      '!',
      '@',
      '#',
      '$',
      '%',
      '^',
      '&',
      '*',
      '(',
      ')',
      '_',
      '+',
      '-',
      '=',
      '{',
      '}',
      '[',
      ']',
      '|',
      '\\\\',
      ';',
      '"',
      "''",
      '<',
      '>',
      ',',
      '.',
      '/',
      '~',
      '`',
    ];

    let sql = column;
    for (const char of chars) {
      sql = `REPLACE(${sql}, '${char}', '')`;
    }
    return sql;
  }

  @Get('reports/ledgers')
  async getLedgers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search: string = '',
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const skip = (pageNum - 1) * limitNum;

      const query = this.ledgerRepo.createQueryBuilder('ledger');

      if (search) {
        // Strip everything except alphanumeric from search query
        const cleanSearch = search.replace(/[^a-zA-Z0-9]/g, '');

        // Generate SQL to strip everything except alphanumeric from DB columns (approx)
        const cleanName = this.cleanSql('ledger.name');
        const cleanPhone = this.cleanSql('ledger.phone_number');
        const cleanGst = this.cleanSql('ledger.gstin');

        query.where(
          `(ledger.name LIKE :search 
              OR ledger.phone_number LIKE :search 
              OR ledger.gstin LIKE :search
              OR ${cleanName} LIKE :cleanSearch
              OR ${cleanPhone} LIKE :cleanSearch
              OR ${cleanGst} LIKE :cleanSearch
            )`,
          { search: `%${search}%`, cleanSearch: `%${cleanSearch}%` },
        );
      }

      const [data, total] = await query
        .orderBy('ledger.name', 'ASC')
        .skip(skip)
        .take(limitNum)
        .getManyAndCount();

      return {
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('Error in getLedgers:', error);
      throw error;
    }
  }

  // Stock Items with pagination
  @Get('reports/stock-items')
  async getStockItems(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search: string = '',
    @Query('parent') parent: string = '',
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const skip = (pageNum - 1) * limitNum;

      const query = this.stockRepo.createQueryBuilder('stock');
      query.where('stock.is_active = true');

      if (parent) {
        query.andWhere('stock.parent = :parent', { parent });
      }

      if (search) {
        const cleanSearch = search.replace(/[^a-zA-Z0-9]/g, '');
        const cleanName = this.cleanSql('stock.name');
        const cleanBarcode = this.cleanSql('stock.ats_barcode');
        const cleanParent = this.cleanSql('stock.parent');

        query.andWhere(
          `(stock.name LIKE :search 
            OR stock.ats_barcode LIKE :search 
            OR stock.parent LIKE :search
            OR ${cleanName} LIKE :cleanSearch
            OR ${cleanBarcode} LIKE :cleanSearch
            OR ${cleanParent} LIKE :cleanSearch
           )`,
          {
            search: `%${search}%`,
            cleanSearch: `%${cleanSearch}%`,
          },
        );
      }

      const [data, total] = await query
        .orderBy('stock.name', 'ASC')
        .skip(skip)
        .take(limitNum)
        .getManyAndCount();

      return {
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('Error in getStockItems:', error);
      throw error;
    }
  }

  @Get('stock-items/parents')
  async getStockParents(@Query('search') search: string = '') {
    try {
      const query = this.stockRepo
        .createQueryBuilder('stock')
        .select('DISTINCT stock.parent', 'parent')
        .where("stock.parent IS NOT NULL AND stock.parent != ''");

      if (search) {
        const cleanSearch = search.replace(/[^a-zA-Z0-9]/g, '');
        const cleanParent = this.cleanSql('stock.parent');

        query.andWhere(
          `(stock.parent LIKE :search OR ${cleanParent} LIKE :cleanSearch)`,
          {
            search: `%${search}%`,
            cleanSearch: `%${cleanSearch}%`,
          },
        );
      }

      const result = await query.orderBy('stock.parent', 'ASC').getRawMany();
      return result.map((r) => r.parent);
    } catch (error) {
      console.error('Error in getStockParents:', error);
      throw error;
    }
  }

  // Orders with pagination
  @Get('reports/orders')
  async getOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search: string = '',
    @Query('user_id') userId: string = '',
    @Query('role') role: string = '',
    @Query('show_all') showAll: string = 'false',
    @Query('date') date: string = '',
    @Query('drafts_only') draftsOnly: string = 'false', // New param
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const skip = (pageNum - 1) * limitNum;

      const query = this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.ledger', 'ledger')
        .leftJoinAndSelect('order.creator', 'creator')
        .orderBy('order.date', 'DESC')
        .addOrderBy('order.created_at', 'DESC');

      if (draftsOnly === 'true') {
        // DRAFT MODE: Show only 'inedit' orders for this user (or all if admin)
        query.where("order.status = 'inedit'");

        if (role && role !== 'admin' && userId) {
          query.andWhere('order.created_by = :userId', {
            userId: parseInt(userId),
          });
          // CRITICAL: We DO NOT filter by Date here.
          // Reason: User wants to find drafts from ANY day to resume work.
        }
      } else if (search) {
        // Relaxed search
        const cleanSearch = search.replace(/[^a-zA-Z0-9]/g, '');

        const cleanBill = this.cleanSql('order.bill_number');
        const cleanLedgerName = this.cleanSql('ledger.name');
        const cleanCreator = this.cleanSql('creator.name');
        const cleanAmount = this.cleanSql('order.total_amount');

        query.where(
          `(${cleanBill} LIKE :cleanSearch 
              OR ${cleanLedgerName} LIKE :cleanSearch 
              OR ${cleanCreator} LIKE :cleanSearch
              OR ${cleanAmount} LIKE :cleanSearch
              OR order.date LIKE :search
              OR order.bill_number LIKE :search
              OR ledger.name LIKE :search
            )`,
          { search: `%${search}%`, cleanSearch: `%${cleanSearch}%` },
        );
      } else {
        // Default View: Hide Completed/Fetched orders UNLESS show_all is requested
        if (showAll !== 'true') {
          query.where("order.status != 'fetched'");
        }
      }

      // Apply Date/User filters ONLY if NOT in drafts_only mode (and not already filtered by search/draft logic above)
      // Actually, standard filters should apply unless specifically overridden.
      // logic refinement:

      if (draftsOnly !== 'true') {
        // For non-admin users, filter by their own orders AND strictly TODAY's orders
        if (role && role !== 'admin' && userId) {
          query.andWhere('order.created_by = :userId', {
            userId: parseInt(userId),
          });

          // Filter by Date (or Dashboard visibility logic)
          if (date) {
            // Modified Logic: Show (Unsynced from ANY date) OR (Any Status from TODAY)
            // We use the passed 'date' as "Today" (client time)
            query.andWhere(
              "(order.status != 'fetched' OR order.date = :date)",
              { date },
            );
          } else {
            // Fallback if no date passed (server time)
            query.andWhere(
              "(order.status != 'fetched' OR DATE(order.date) = CURDATE())",
            );
          }
        }
      }

      const [data, total] = await query
        .skip(skip)
        .take(limitNum)
        .getManyAndCount();

      return {
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('Error in getOrders:', error);
      throw error;
    }
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: number) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['ledger'],
    });
  }

  @Get('orders/:id/details')
  async getOrderDetails(@Param('id') id: number) {
    return this.orderDetailRepo.find({
      where: { order: { id } },
      relations: ['stock_item'],
    });
  }

  @Delete('orders/:id')
  async deleteOrder(@Param('id') id: string) {
    try {
      const orderId = parseInt(id);
      const order = await this.orderRepo.findOne({ where: { id: orderId } });
      if (!order) throw new Error('Order not found');

      if (order.status !== 'inedit') {
        throw new Error(
          'Cannot delete order that is already Shared or Synced.',
        );
      }

      // Delete details first
      const details = await this.orderDetailRepo.find({
        where: { order: { id: orderId } },
      });
      await this.orderDetailRepo.remove(details);
      await this.orderRepo.remove(order);
      return { success: true };
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }

  @Put('orders/:id')
  async updateOrder(@Param('id') id: string, @Body() body: any) {
    try {
      const orderId = parseInt(id);
      const { ledger_id, date, total_amount, items, order_type, remark } = body;

      const order = await this.orderRepo.findOne({ where: { id: orderId } });
      if (!order) throw new Error('Order not found');

      if (body.bill_number) {
        const existingOrder = await this.orderRepo.findOne({
          where: { bill_number: body.bill_number },
        });
        if (existingOrder && existingOrder.id !== orderId) {
          throw new Error(
            `Order with Bill Number '${body.bill_number}' already exists.`,
          );
        }
        order.bill_number = body.bill_number;
      }

      // Optional: Block update if already 'fetched' (synced to Tally)
      // Lock update if not in 'inedit'
      if (order.status !== 'inedit') {
        throw new Error('Cannot edit order that is already Shared or Synced.');
      }

      // Update Header
      if (ledger_id) {
        const ledger = await this.ledgerRepo.findOneBy({ id: ledger_id });
        if (ledger) {
          order.ledger = ledger;
          // Update Snapshot (User might have changed customer)
          order.customer_name = ledger.person_name || ledger.name;
          order.customer_address = ledger.address;
          order.customer_phone = ledger.phone_number;
          order.customer_email = ledger.email;
          order.customer_gstin = ledger.gstin;
          order.customer_pincode = ledger.pincode;
          order.customer_state = ledger.state;
        }
      }

      order.date = date;
      order.total_amount = total_amount;
      order.order_type = order_type || 'Tax Invoice';
      order.remark = remark;
      // Reset status to 'inedit' if it was 'pending' and we edited it?
      // User logic: "they will save... this inedit". Assume edit puts it back to draft.
      order.status = 'inedit';

      const savedOrder = await this.orderRepo.save(order);

      // Replace Details: Delete old, Insert new
      const oldDetails = await this.orderDetailRepo.find({
        where: { order: { id: orderId } },
      });
      await this.orderDetailRepo.remove(oldDetails);

      for (const item of items) {
        const orderDetail = new OrderDetail();
        orderDetail.order = savedOrder;

        const stockItem = await this.stockRepo.findOneBy({
          masterid: item.stock_item_id,
        });
        if (stockItem) {
          orderDetail.stock_item_id = stockItem.masterid;
          orderDetail.item_name = stockItem.name;
          orderDetail.barcode = item.barcode; // Or stockItem.ats_barcode
        } else {
          // Fallback if item ID missing but others present (shouldn't happen in valid flow)
          orderDetail.item_name = item.name || 'Unknown Item';
        }

        orderDetail.rate = item.rate;
        orderDetail.unit = item.unit;
        orderDetail.quantity = item.quantity;
        orderDetail.amount = item.amount;
        orderDetail.gst = item.gst;
        orderDetail.selected_scheme = item.selected_scheme;
        orderDetail.discount_percentage = item.selected_discount;
        orderDetail.livestock_type = item.livestock_type;
        await this.orderDetailRepo.save(orderDetail);
      }

      return savedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  @Post('orders/:id/sync')
  async syncOrderToTally(@Param('id') id: string) {
    try {
      // New Workflow: Just mark as PENDING
      const orderId = parseInt(id);
      const order = await this.orderRepo.findOne({ where: { id: orderId } });
      if (!order) return { success: false, message: 'Order not found' };

      // Prevent Double Queueing
      if (order.status === 'pending') {
        return {
          success: true,
          message: 'Order already queued for sync',
          data: order,
        };
      }
      if (order.status === 'fetched') {
        return { success: true, message: 'Order already synced', data: order };
      }

      order.status = 'pending';
      await this.orderRepo.save(order);

      // Reload with relations to return full object for frontend update
      const updatedOrder = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['ledger'],
      });

      return {
        success: true,
        message: 'Order marked for Tally Sync',
        data: updatedOrder,
      };
    } catch (error) {
      console.error('Error in syncOrderToTally:', error);
      throw error;
    }
  }

  // Tally Pull Endpoint - Protected by API Key
  @Get('tally/pending-orders')
  async getPendingOrders(@Headers('x-api-key') apiKey: string) {
    const expectedKey = process.env.TALLY_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    const limit = 10; // Reduced to 10 to ensure minimal load per request
    console.time('fetchPendingOrders');
    const pendingOrders = await this.orderRepo.find({
      where: { status: 'pending' },
      relations: ['ledger', 'orderDetails', 'creator'], // Fetch all relations needed for XML
      order: { date: 'ASC', id: 'ASC' }, // Process oldest first
      take: limit,
    });
    console.timeEnd('fetchPendingOrders');
    console.log(`[Tally Sync] Fetching ${pendingOrders.length} pending orders`);

    const data = pendingOrders.map((order) => {
      // Safe Customer Logic: Prefer Ledger Config, Fallback to Snapshot
      const customerName =
        order.ledger?.name || order.customer_name || 'Unknown Customer';
      const creatorName = order.creator ? order.creator.username : 'Unknown';

      return {
        id: order.id,
        created_by: creatorName,
        bill_number: order.bill_number,
        date: order.date,
        total_amount: order.total_amount,
        order_type: order.order_type || 'Tax Invoice',
        remark: order.remark,

        customer: {
          name: customerName,
          // GUID is crucial. If present, Tally identifies existing ledger.
          // If missing, Tally should look up by Name or Create New.
          guid: order.ledger?.tally_guid || '',

          // Contact Details for Creation
          address: order.ledger?.address || order.customer_address || '',
          phone: order.ledger?.phone_number || order.customer_phone || '',
          email: order.ledger?.email || order.customer_email || '',
          gstin: order.ledger?.gstin || order.customer_gstin || '',
          pincode: order.ledger?.pincode || '',
          state: order.ledger?.state || '',
          contact_person: order.ledger?.person_name || customerName,
        },

        items: order.orderDetails
          ? order.orderDetails.map((item) => ({
              stock_item_name: item.item_name, // This MUST match Tally Stock Item Name
              quantity: item.quantity,
              rate: item.rate,
              unit: item.unit,
              amount: item.amount,
              discount_percentage: item.discount_percentage,
              gst: item.gst,
              godown: item.livestock_type || 'Shop',
            }))
          : [],
      };
    });

    return { data };
  }

  @Get('tally/confirm-orders')
  confirmOrdersDiag() {
    return {
      message: 'Method Not Allowed. Please use POST to confirm orders.',
      example_payload: {
        id: 1,
        bill_number: 'INV/001',
        tally_master_id: '12345',
        ledger_guid: 'optional-guid',
      },
    };
  }

  @Post('tally/confirm-orders')
  async confirmOrders(
    @Headers('x-api-key') apiKey: string,
    @Body()
    check: {
      id: number;
      bill_number: string;
      tally_master_id: string;
      ledger_guid?: string;
    },
  ) {
    const expectedKey = process.env.TALLY_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    try {
      const order = await this.orderRepo.findOne({
        where: { id: check.id },
        relations: ['ledger'],
      });

      if (!order) {
        return { id: check.id, status: 'failed', message: 'Order not found' };
      }

      // 0. Duplicate Bill Number Check
      if (check.bill_number) {
        const existingOrder = await this.orderRepo.findOne({
          where: { bill_number: check.bill_number },
        });
        if (existingOrder && existingOrder.id !== check.id) {
          console.warn(
            `[Tally Sync] Rejected confirmation for Order ${check.id} due to duplicate Bill No: ${check.bill_number}`,
          );
          return {
            id: check.id,
            status: 'failed',
            message: `Bill Number ${check.bill_number} already exists on Order ${existingOrder.id}`,
          };
        }
      }

      // 1. Update Order Details
      order.bill_number = check.bill_number;
      order.tally_master_id = check.tally_master_id;
      order.status = 'fetched'; // Mark as Completed/Synced

      // 2. Handle Customer creation/linking
      if (check.ledger_guid) {
        const ledger = order.ledger;

        if (!ledger || !ledger.tally_guid) {
          let existingLedger = await this.ledgerRepo.findOne({
            where: { tally_guid: check.ledger_guid },
          });

          if (!existingLedger) {
            const customerName =
              order.customer_name || (ledger ? ledger.name : '');
            if (customerName) {
              existingLedger = await this.ledgerRepo.findOne({
                where: { name: customerName },
              });
            }
          }

          if (existingLedger) {
            existingLedger.tally_guid = check.ledger_guid;
            await this.ledgerRepo.save(existingLedger);
            order.ledger = existingLedger;
          } else {
            const newLedger = new Ledger();
            newLedger.name = order.customer_name || 'Unknown';
            newLedger.tally_guid = check.ledger_guid;
            newLedger.address = order.customer_address;
            newLedger.phone_number = order.customer_phone;
            newLedger.email = order.customer_email;
            newLedger.gstin = order.customer_gstin;
            newLedger.person_name = order.customer_name;

            const savedLedger = await this.ledgerRepo.save(newLedger);
            order.ledger = savedLedger;
          }
        }
      }

      await this.orderRepo.save(order);
      return { id: check.id, status: 'success' };
    } catch (e) {
      console.error(`Failed to confirm order ${check.id}`, e);
      return { id: check.id, status: 'error', message: e.message };
    }
  }
}
