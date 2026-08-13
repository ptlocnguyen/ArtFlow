(function () {
  function create(dependencies) {
    const makeLocalId = dependencies.makeLocalId;
    const channels = dependencies.channels;

    function normalizeProduct(product) {
      return {
        id: product.id,
        sku: product.sku || "",
        name: product.name || "",
        category: product.category || "",
        brand: product.brand || "",
        barcode: product.barcode || "",
        unit: product.unit || "cái",
        weightGrams: Number(product.weightGrams || 0),
        dimensions: product.dimensions || "",
        origin: product.origin || "",
        material: product.material || "",
        costPrice: Number(product.costPrice || 0),
        salePrice: Number(product.salePrice || 0),
        stock: Number(product.stock || 0),
        lowStock: Number(product.lowStock || 0),
        imageUrl: product.imageUrl || "",
        shortDescription: product.shortDescription || "",
        keyFeatures: product.keyFeatures || "",
        targetAudience: product.targetAudience || "",
        seoKeywords: product.seoKeywords || "",
        contentStatus: product.contentStatus || "not_started",
        contentOwner: product.contentOwner || "",
        contentNote: product.contentNote || "",
        websiteProductUrl: product.websiteProductUrl || "",
        shopeeProductUrl: product.shopeeProductUrl || "",
        tiktokProductUrl: product.tiktokProductUrl || "",
        facebookProductUrl: product.facebookProductUrl || "",
        contentPostLinks: product.contentPostLinks || "",
        contentDocUrl: product.contentDocUrl || "",
        mediaFolderUrl: product.mediaFolderUrl || "",
        imageFolderUrl: product.imageFolderUrl || "",
        videoFolderUrl: product.videoFolderUrl || "",
        status: product.status || "active",
        createdAt: product.createdAt || "",
        updatedAt: product.updatedAt || ""
      };
    }
    
    function normalizeProductOption(option) {
      return {
        id: option.id,
        type: option.type || "category",
        name: option.name || "",
        status: option.status || "active",
        createdAt: option.createdAt || "",
        updatedAt: option.updatedAt || ""
      };
    }
    
    function normalizeContentItem(item) {
      return {
        id: item.id,
        type: item.type || "campaign",
        title: item.title || "",
        productId: item.productId || "",
        channel: item.channel || "multi",
        status: item.status || "idea",
        priority: item.priority || "normal",
        dueDate: item.dueDate || "",
        publishAt: item.publishAt || "",
        template: item.template || "",
        owner: item.owner || "",
        collaborators: item.collaborators || "",
        tags: item.tags || "",
        campaign: item.campaign || "",
        brief: item.brief || "",
        checklist: Array.isArray(item.checklist) ? item.checklist : [],
        assetChecklist: Array.isArray(item.assetChecklist) ? item.assetChecklist : [],
        commentLog: Array.isArray(item.commentLog) ? item.commentLog : [],
        promptText: item.promptText || "",
        targetMetric: item.targetMetric || "",
        result: item.result && typeof item.result === "object" ? item.result : {},
        note: item.note || "",
        publishUrl: item.publishUrl || "",
        contentDocUrl: item.contentDocUrl || "",
        mediaFolderUrl: item.mediaFolderUrl || "",
        createdBy: item.createdBy || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || ""
      };
    }
    
    function normalizeIncenseWish(item) {
      return {
        id: item.id || makeLocalId("wish"),
        kind: item.kind || "sales",
        wish: item.wish || "",
        actorId: item.actorId || "",
        actorName: item.actorName || "",
        actorEmail: item.actorEmail || "",
        offerings: Array.isArray(item.offerings)
          ? item.offerings
          : String(item.offerings || "").split(",").map(value => value.trim()).filter(Boolean),
        createdAt: item.createdAt || ""
      };
    }
    
    function normalizeTeamAction(action) {
      return {
        id: action.id || makeLocalId("action"),
        title: action.title || action.name || action.task || "",
        owner: action.owner || "",
        dueDate: action.dueDate || "",
        status: action.status || "todo"
      };
    }
    
    function normalizeTeamMeeting(meeting) {
      const legacyDecisions = Array.isArray(meeting.decisions)
        ? meeting.decisions
        : String(meeting.decisions || "").split(/\r?\n/).map(value => value.trim()).filter(Boolean);
      const legacyActions = Array.isArray(meeting.actions)
        ? meeting.actions
        : String(meeting.nextActions || "").split(/\r?\n/).map((title, index) => ({ id: `${meeting.id || "meeting"}-action-${index + 1}`, title }));
      return {
        id: meeting.id || makeLocalId("meeting"),
        title: meeting.title || "",
        type: meeting.type || "weekly",
        status: meeting.status || "draft",
        meetingAt: meeting.meetingAt || meeting.meetingDate || "",
        owner: meeting.owner || "",
        attendees: meeting.attendees || meeting.participants || "",
        agenda: meeting.agenda || "",
        notes: meeting.notes || "",
        decisions: legacyDecisions,
        actions: legacyActions.map(normalizeTeamAction),
        template: meeting.template || "",
        sourceType: meeting.sourceType || "manual",
        sourceId: meeting.sourceId || "",
        commentLog: Array.isArray(meeting.commentLog) ? meeting.commentLog : [],
        links: meeting.links || "",
        createdAt: meeting.createdAt || "",
        updatedAt: meeting.updatedAt || ""
      };
    }
    
    function normalizeTeamPlan(plan) {
      return {
        id: plan.id || makeLocalId("plan"),
        title: plan.title || "",
        period: plan.period || "",
        status: plan.status || "idea",
        owner: plan.owner || "",
        goalRevenue: Number(plan.goalRevenue || 0),
        goalProfit: Number(plan.goalProfit || 0),
        budget: Number(plan.budget || 0),
        channels: plan.channels || "",
        focusProducts: plan.focusProducts || "",
        milestones: Array.isArray(plan.milestones) ? plan.milestones : [],
        sourceType: plan.sourceType || "manual",
        sourceId: plan.sourceId || "",
        commentLog: Array.isArray(plan.commentLog) ? plan.commentLog : [],
        risks: plan.risks || "",
        note: plan.note || "",
        createdAt: plan.createdAt || "",
        updatedAt: plan.updatedAt || ""
      };
    }
    
    function normalizePricingLine(line) {
      const allowedTypes = ["fixed", "cost_percent", "price_percent", "note"];
      const type = allowedTypes.includes(line.type) ? line.type : "fixed";
      return {
        id: line.id || makeLocalId("price_line"),
        name: line.name || line.label || "",
        label: line.name || line.label || "",
        type,
        value: Math.max(0, Number(line.value || 0)),
        note: line.note || "",
        included: line.included !== false
      };
    }
    
    function normalizePricingScenario(scenario) {
      const allowedRoundingModes = ["none", "step", "tail9"];
      const roundingMode = allowedRoundingModes.includes(scenario.roundingMode) ? scenario.roundingMode : "step";
      return {
        id: scenario.id || makeLocalId("price_scenario"),
        name: scenario.name || scenario.label || "",
        label: scenario.name || scenario.label || "",
        channelId: scenario.channelId || scenario.channelCode || "",
        channelCode: scenario.channelCode || "",
        targetMargin: Math.max(0, Number(scenario.targetMargin ?? 35)),
        targetProfitAmount: Math.max(0, Number(scenario.targetProfitAmount || 0)),
        manualPrice: Math.max(0, Number(scenario.manualPrice || scenario.salePrice || scenario.overridePrice || 0)),
        salePrice: Math.max(0, Number(scenario.manualPrice || scenario.salePrice || scenario.overridePrice || 0)),
        roundingMode,
        roundingStep: Math.max(1, Number(scenario.roundingStep || 1000)),
        resultSnapshot: scenario.resultSnapshot && typeof scenario.resultSnapshot === "object" ? scenario.resultSnapshot : null
      };
    }
    
    function normalizePricingModel(model) {
      return {
        id: model.id || makeLocalId("pricing"),
        title: model.title || "",
        productId: model.productId || "",
        channelId: model.channelId || model.channelCode || "",
        channelCode: model.channelCode || "",
        priceTarget: model.priceTarget || "offline",
        appliedPrice: Number(model.appliedPrice || 0),
        appliedAt: model.appliedAt || "",
        appliedToProduct: Boolean(model.appliedToProduct),
        appliedToChannelProduct: Boolean(model.appliedToChannelProduct),
        appliedChannelId: model.appliedChannelId || "",
        appliedChannelCode: model.appliedChannelCode || "",
        appliedSnapshot: model.appliedSnapshot && typeof model.appliedSnapshot === "object" ? model.appliedSnapshot : null,
        roundingMode: model.roundingMode || "step",
        roundingStep: Number(model.roundingStep || 1000),
        targetProfitAmount: Number(model.targetProfitAmount || 0),
        targetMargin: Number(model.targetMargin || 35),
        selectedScenarioId: model.selectedScenarioId || "",
        status: model.status || "draft",
        owner: model.owner || "",
        baseCost: Number(model.baseCost || 0),
        quantity: Math.max(1, Number(model.quantity || 1)),
        lines: Array.isArray(model.lines) ? model.lines.map(normalizePricingLine) : [],
        scenarios: Array.isArray(model.scenarios) ? model.scenarios.map(normalizePricingScenario) : [],
        sourceType: model.sourceType || "product",
        sourceId: model.sourceId || model.productId || "",
        commentLog: Array.isArray(model.commentLog) ? model.commentLog : [],
        note: model.note || "",
        createdAt: model.createdAt || "",
        updatedAt: model.updatedAt || ""
      };
    }
    
    function normalizeTeamDecision(decision) {
      return {
        id: decision.id || makeLocalId("decision"),
        title: decision.title || "",
        sourceType: decision.sourceType || "manual",
        sourceId: decision.sourceId || "",
        status: decision.status || "active",
        owner: decision.owner || "",
        decidedAt: decision.decidedAt || "",
        tags: decision.tags || "",
        detail: decision.detail || "",
        nextReviewAt: decision.nextReviewAt || "",
        sourceType: decision.sourceType || "manual",
        sourceId: decision.sourceId || "",
        commentLog: Array.isArray(decision.commentLog) ? decision.commentLog : [],
        createdAt: decision.createdAt || "",
        updatedAt: decision.updatedAt || ""
      };
    }
    
    function normalizeSalesChannel(channel) {
      return {
        id: channel.id || makeLocalId("channel"),
        code: channel.code || "",
        name: channel.name || "",
        type: channel.type || "marketplace",
        status: channel.status || "active",
        syncMode: channel.syncMode || "manual",
        defaultPricePolicy: channel.defaultPricePolicy || "same",
        note: channel.note || "",
        createdAt: channel.createdAt || "",
        updatedAt: channel.updatedAt || ""
      };
    }
    
    function normalizeChannelProduct(item) {
      return {
        id: item.id || makeLocalId("channel_product"),
        channelId: item.channelId || "",
        productId: item.productId || "",
        channelSku: item.channelSku || "",
        channelName: item.channelName || "",
        channelPrice: Number(item.channelPrice || 0),
        channelStock: Number(item.channelStock || 0),
        syncStock: item.syncStock !== false,
        syncPrice: item.syncPrice === true,
        status: item.status || "active",
        lastSyncAt: item.lastSyncAt || "",
        note: item.note || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || ""
      };
    }
    
    function normalizeInventoryReservation(item) {
      return {
        id: item.id || makeLocalId("reservation"),
        productId: item.productId || "",
        orderId: item.orderId || "",
        channelId: item.channelId || "",
        quantity: Number(item.quantity || 0),
        status: item.status || "active",
        reason: item.reason || "",
        createdBy: item.createdBy || "",
        createdAt: item.createdAt || "",
        releasedAt: item.releasedAt || ""
      };
    }
    
    function normalizeCampaign(item) {
      return {
        id: item.id || makeLocalId("campaign"),
        name: item.name || "",
        status: item.status || "idea",
        owner: item.owner || "",
        channels: item.channels || "",
        startDate: item.startDate || "",
        endDate: item.endDate || "",
        goal: item.goal || "",
        budget: Number(item.budget || 0),
        targetRevenue: Number(item.targetRevenue || 0),
        targetProfit: Number(item.targetProfit || 0),
        note: item.note || "",
        createdBy: item.createdBy || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || ""
      };
    }
    
    function normalizeWorkspaceTask(item) {
      item = item || {};
      return {
        id: item.id || makeLocalId("task"),
        title: item.title || "",
        status: item.status || "todo",
        priority: item.priority || "normal",
        owner: item.owner || "",
        sourceType: item.sourceType || "",
        sourceId: item.sourceId || "",
        productId: item.productId || "",
        channelId: item.channelId || "",
        campaignId: item.campaignId || "",
        dueDate: item.dueDate || "",
        description: item.description || "",
        createdBy: item.createdBy || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || ""
      };
    }
    
    function normalizeCustomer(customer) {
      return {
        id: customer.id,
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        group: customer.group || "Bán lẻ",
        status: customer.status || "active",
        totalSpent: Number(customer.totalSpent || 0),
        loyaltyPoints: Number(customer.loyaltyPoints || 0),
        lifetimePoints: Number(customer.lifetimePoints || 0),
        lastOrderAt: customer.lastOrderAt || "",
        note: customer.note || "",
        createdAt: customer.createdAt || "",
        updatedAt: customer.updatedAt || ""
      };
    }
    
    function normalizeOrderItem(item) {
      return {
        id: item.id,
        orderId: item.orderId || "",
        productId: item.productId || "",
        sku: item.sku || "",
        name: item.name || "",
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        costPrice: Number(item.costPrice || 0),
        discountPercent: Number(item.discountPercent || 0),
        lineTotal: Number(item.lineTotal || 0),
        createdAt: item.createdAt || ""
      };
    }
    
    function normalizeOrder(order) {
      const items = (order.items || []).map(normalizeOrderItem);
      return {
        id: order.id,
        code: order.code || "",
        customerId: order.customerId || "",
        status: order.status || "pending",
        paymentStatus: order.paymentStatus || "unpaid",
        paymentMethod: order.paymentMethod || "cash",
        subtotal: Number(order.subtotal || 0),
        discount: Number(order.discount || 0),
        discountPercent: Number(order.discountPercent || 0),
        loyaltyPointsUsed: Number(order.loyaltyPointsUsed || 0),
        loyaltyDiscount: Number(order.loyaltyDiscount || 0),
        cashReceived: Number(order.cashReceived || 0),
        changeAmount: Number(order.changeAmount || 0),
        roundingAmount: Number(order.roundingAmount || 0),
        shippingFee: Number(order.shippingFee || 0),
        total: Number(order.total || 0),
        receiptPdfUrl: order.receiptPdfUrl || "",
        returnedAmount: Number(order.returnedAmount || 0),
        refundedAmount: Number(order.refundedAmount || 0),
        netTotal: Number(order.netTotal === undefined ? Math.max(0, Number(order.total || 0) - Number(order.returnedAmount || 0)) : order.netTotal),
        note: order.note || "",
        createdBy: order.createdBy || "",
        createdAt: order.createdAt || "",
        updatedAt: order.updatedAt || "",
        channel: order.channel || "pos",
        shippingStatus: order.shippingStatus || "none",
        carrier: order.carrier || "",
        trackingCode: order.trackingCode || "",
        productId: items[0] ? items[0].productId : "",
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        items
      };
    }
    
    function normalizeSalesReturn(salesReturn) {
      return {
        id: salesReturn.id,
        code: salesReturn.code || "",
        orderId: salesReturn.orderId || "",
        customerId: salesReturn.customerId || "",
        amount: Number(salesReturn.amount || 0),
        note: salesReturn.note || "",
        createdBy: salesReturn.createdBy || "",
        createdAt: salesReturn.createdAt || "",
        items: (salesReturn.items || []).map(item => ({
          id: item.id,
          returnId: item.returnId || salesReturn.id,
          orderItemId: item.orderItemId || "",
          productId: item.productId || "",
          sku: item.sku || "",
          name: item.name || "",
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          costPrice: Number(item.costPrice || 0),
          lineTotal: Number(item.lineTotal || 0),
          createdAt: item.createdAt || ""
        }))
      };
    }
    
    function normalizeOrderRefund(refund) {
      return {
        id: refund.id,
        orderId: refund.orderId || "",
        salesReturnId: refund.salesReturnId || "",
        cashTransactionId: refund.cashTransactionId || "",
        accountId: refund.accountId || "",
        categoryId: refund.categoryId || "",
        amount: Number(refund.amount || 0),
        refundDate: refund.refundDate || "",
        note: refund.note || "",
        createdBy: refund.createdBy || "",
        createdAt: refund.createdAt || ""
      };
    }
    
    function normalizeStockMovement(movement) {
      return {
        id: movement.id,
        productId: movement.productId || "",
        sku: movement.sku || "",
        productName: movement.productName || "",
        type: movement.type || "",
        quantityDelta: Number(movement.quantityDelta || 0),
        stockBefore: Number(movement.stockBefore || 0),
        stockAfter: Number(movement.stockAfter || 0),
        reason: movement.reason || "",
        referenceType: movement.referenceType || "",
        referenceId: movement.referenceId || "",
        createdBy: movement.createdBy || "",
        createdAt: movement.createdAt || ""
      };
    }
    
    function normalizeAccountingAccount(account) {
      return {
        id: account.id,
        name: account.name || "",
        type: account.type || "cash",
        openingBalance: Number(account.openingBalance || 0),
        currentBalance: Number(account.currentBalance || 0),
        status: account.status || "active",
        createdAt: account.createdAt || "",
        updatedAt: account.updatedAt || ""
      };
    }
    
    function normalizeAccountingCategory(category) {
      return {
        id: category.id,
        name: category.name || "",
        type: category.type || "expense",
        group: category.group || "other",
        status: category.status || "active",
        createdAt: category.createdAt || "",
        updatedAt: category.updatedAt || ""
      };
    }
    
    function normalizeAccountingReconciliation(reconciliation) {
      return {
        id: reconciliation.id,
        accountId: reconciliation.accountId || "",
        systemBalance: Number(reconciliation.systemBalance || 0),
        actualBalance: Number(reconciliation.actualBalance || 0),
        difference: Number(reconciliation.difference || 0),
        note: reconciliation.note || "",
        reconciledBy: reconciliation.reconciledBy || "",
        reconciledAt: reconciliation.reconciledAt || "",
        createdAt: reconciliation.createdAt || ""
      };
    }
    
    function normalizeCashTransaction(transaction) {
      return {
        id: transaction.id,
        type: transaction.type || "expense",
        accountId: transaction.accountId || "",
        categoryId: transaction.categoryId || "",
        amount: Number(transaction.amount || 0),
        transactionDate: transaction.transactionDate || "",
        description: transaction.description || "",
        referenceType: transaction.referenceType || "",
        referenceId: transaction.referenceId || "",
        channelId: transaction.channelId || "",
        documentUrl: transaction.documentUrl || "",
        createdBy: transaction.createdBy || "",
        status: transaction.status || "active",
        createdAt: transaction.createdAt || "",
        updatedAt: transaction.updatedAt || ""
      };
    }
    
    function normalizePlatformPayout(payout) {
      return {
        id: payout.id, channelId: payout.channelId || "", channelCode: payout.channelCode || "", payoutCode: payout.payoutCode || "",
        periodStart: payout.periodStart || "", periodEnd: payout.periodEnd || "", payoutDate: payout.payoutDate || "", accountId: payout.accountId || "",
        grossAmount: Number(payout.grossAmount || 0), totalFees: Number(payout.totalFees || 0), totalRefunds: Number(payout.totalRefunds || 0),
        expectedAmount: Number(payout.expectedAmount || 0), actualAmount: Number(payout.actualAmount || 0), difference: Number(payout.difference || 0),
        status: payout.status || "draft", sourceFileName: payout.sourceFileName || "", sourceFileUrl: payout.sourceFileUrl || "",
        sourceFileNote: payout.sourceFileNote || "", note: payout.note || "", postedTransactionId: payout.postedTransactionId || "",
        createdBy: payout.createdBy || "", createdAt: payout.createdAt || "", updatedAt: payout.updatedAt || "",
        items: Array.isArray(payout.items) ? payout.items.map(item => ({ ...item, productTotal: Number(item.productTotal || 0), expectedNetAmount: Number(item.expectedNetAmount || 0), platformNetAmount: Number(item.platformNetAmount || 0), difference: Number(item.difference || 0) })) : []
      };
    }
    
    function normalizeSupplier(supplier) {
      return {
        id: supplier.id,
        code: supplier.code || "",
        name: supplier.name || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        taxCode: supplier.taxCode || "",
        address: supplier.address || "",
        status: supplier.status || "active",
        totalPurchased: Number(supplier.totalPurchased || 0),
        outstanding: Number(supplier.outstanding || 0),
        creditBalance: Number(supplier.creditBalance || 0),
        lastPurchaseAt: supplier.lastPurchaseAt || "",
        note: supplier.note || "",
        createdAt: supplier.createdAt || "",
        updatedAt: supplier.updatedAt || ""
      };
    }
    
    function normalizePurchaseOrder(order) {
      return {
        id: order.id,
        code: order.code || "",
        supplierId: order.supplierId || "",
        status: order.status || "draft",
        paymentStatus: order.paymentStatus || "unpaid",
        subtotal: Number(order.subtotal || 0),
        discount: Number(order.discount || 0),
        shippingFee: Number(order.shippingFee || 0),
        total: Number(order.total || 0),
        paidAmount: Number(order.paidAmount || 0),
        creditAppliedAmount: Number(order.creditAppliedAmount || 0),
        settledAmount: Number(order.settledAmount === undefined ? Number(order.paidAmount || 0) + Number(order.creditAppliedAmount || 0) : order.settledAmount),
        returnedAmount: Number(order.returnedAmount || 0),
        netTotal: Number(order.netTotal === undefined ? Math.max(0, Number(order.total || 0) - Number(order.returnedAmount || 0)) : order.netTotal),
        outstanding: Number(order.outstanding === undefined ? Math.max(0, Number(order.total || 0) - Number(order.returnedAmount || 0) - Number(order.paidAmount || 0) - Number(order.creditAppliedAmount || 0)) : order.outstanding),
        creditAmount: Number(order.creditAmount || 0),
        dueDate: order.dueDate || "",
        invoiceNumber: order.invoiceNumber || "",
        note: order.note || "",
        createdBy: order.createdBy || "",
        receivedAt: order.receivedAt || "",
        createdAt: order.createdAt || "",
        updatedAt: order.updatedAt || "",
        items: (order.items || []).map(item => ({
          id: item.id,
          purchaseOrderId: item.purchaseOrderId || order.id,
          productId: item.productId || "",
          sku: item.sku || "",
          name: item.name || "",
          quantity: Number(item.quantity || 0),
          unitCost: Number(item.unitCost || 0),
          lineTotal: Number(item.lineTotal || 0),
          createdAt: item.createdAt || ""
        }))
      };
    }
    
    function normalizeSupplierPayment(payment) {
      return {
        id: payment.id,
        purchaseOrderId: payment.purchaseOrderId || "",
        supplierId: payment.supplierId || "",
        cashTransactionId: payment.cashTransactionId || "",
        amount: Number(payment.amount || 0),
        paymentDate: payment.paymentDate || "",
        note: payment.note || "",
        createdBy: payment.createdBy || "",
        createdAt: payment.createdAt || ""
      };
    }
    
    function normalizePurchaseReturn(purchaseReturn) {
      return {
        id: purchaseReturn.id,
        code: purchaseReturn.code || "",
        purchaseOrderId: purchaseReturn.purchaseOrderId || "",
        supplierId: purchaseReturn.supplierId || "",
        amount: Number(purchaseReturn.amount || 0),
        note: purchaseReturn.note || "",
        createdBy: purchaseReturn.createdBy || "",
        createdAt: purchaseReturn.createdAt || "",
        items: (purchaseReturn.items || []).map(item => ({
          id: item.id,
          returnId: item.returnId || purchaseReturn.id,
          purchaseOrderItemId: item.purchaseOrderItemId || "",
          productId: item.productId || "",
          sku: item.sku || "",
          name: item.name || "",
          quantity: Number(item.quantity || 0),
          unitCost: Number(item.unitCost || 0),
          lineTotal: Number(item.lineTotal || 0),
          createdAt: item.createdAt || ""
        }))
      };
    }
    
    function normalizeSupplierCreditApplication(application) {
      return {
        id: application.id,
        supplierId: application.supplierId || "",
        purchaseOrderId: application.purchaseOrderId || "",
        amount: Number(application.amount || 0),
        note: application.note || "",
        createdBy: application.createdBy || "",
        createdAt: application.createdAt || ""
      };
    }

    return { normalizeProduct, normalizeProductOption, normalizeContentItem, normalizeIncenseWish, normalizeTeamAction, normalizeTeamMeeting, normalizeTeamPlan, normalizePricingLine, normalizePricingScenario, normalizePricingModel, normalizeTeamDecision, normalizeSalesChannel, normalizeChannelProduct, normalizeInventoryReservation, normalizeCampaign, normalizeWorkspaceTask, normalizeCustomer, normalizeOrderItem, normalizeOrder, normalizeSalesReturn, normalizeOrderRefund, normalizeStockMovement, normalizeAccountingAccount, normalizeAccountingCategory, normalizeAccountingReconciliation, normalizeCashTransaction, normalizePlatformPayout, normalizeSupplier, normalizePurchaseOrder, normalizeSupplierPayment, normalizePurchaseReturn, normalizeSupplierCreditApplication };
  }

  window.ArtFlowDomain = Object.freeze({ create });
}());
