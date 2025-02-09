import { ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, StringSelectMenuInteraction } from "discord.js";
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, UserFlow, UserFlowInteraction } from "./user-flow";
import { DatabaseError, Product, Shop } from "../database/database-types";
import { addProduct, getShops, removeProduct } from "../database/database-handler";
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/utils";

export class AddProductFlow extends UserFlow {
    public id = "add-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private productName: string | null = null
    private productPrice: number | null = null
    private productDescription: string | null = null

    private selectedShop: Shop | null = null

    public async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop./n-# Use `/shops-manage create` to create a new one')

        const productName = interaction.options.getString('product-name')?.replaceNonBreakableSpace()
        const productDescription = interaction.options.getString('product-description')?.replaceNonBreakableSpace()
        const productPrice = interaction.options.getInteger('product-price')

        if (!productName || !productPrice || !productDescription) return replyErrorMessage(interaction)
    
        if (productName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, 'The product name can\'t contain only custom emojis')
        if (productDescription.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, 'The product description can\'t contain only custom emojis')
        
        this.productName = productName
        this.productPrice = productPrice
        this.productDescription = productDescription

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
    }
    
    protected getMessage(): string {
        const descString = (this.productDescription) ? `. Description: **${this.productDescription.replaceNonBreakableSpace()}**` : ''
        return `Add Product: **${this.productName}** for **${this.productPrice} ${this.selectedShop?.currency.name || '[]'}** in **[${this.selectedShop?.name || 'Select Shop'}]**${descString}`
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            `${this.id}+select-shop`,
            'Select a shop',
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitButton = new ExtendedButtonComponent(`${this.id}+submit`,
            new ButtonBuilder()
                .setLabel('Add Product')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)
    }

    protected async success(interaction: UserFlowInteraction) {
        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, 'No selected shop')
            if (!this.productName) return updateAsErrorMessage(interaction, 'No product name')
            if (!this.productPrice) return updateAsErrorMessage(interaction, 'No product price')

            await addProduct(this.selectedShop.id, { name: this.productName, description: this.productDescription || '', price: this.productPrice })

            await updateAsSuccessMessage(interaction, `You succesfully added the product **${this.productName}** to the shop **${this.selectedShop.name}**`)

        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return
        }
    }
}

enum RemoveProductFlowStage {
    SELECT_SHOP,
    SELECT_PRODUCT
}

export class RemoveProductFlow extends UserFlow {
    public id = "remove-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private stage: RemoveProductFlowStage = RemoveProductFlowStage.SELECT_SHOP
    private componentsByStage: Map<RemoveProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedProduct: Product | null = null

    private response: InteractionCallbackResponse | null = null

    public async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, 'There isn\'t any shop./n-# Use `/shops-manage create` to create a new one')

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
    }

    protected getMessage(): string {
        if (this.stage == RemoveProductFlowStage.SELECT_SHOP) return `Remove a Product from: **[${this.selectedShop?.name || 'Select Shop'}]**`
        if (this.stage == RemoveProductFlowStage.SELECT_PRODUCT) return `Remove Product: **[${this.selectedProduct?.name || 'Select Product'}]** from **[${this.selectedShop?.name}]**`

        return ''
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            `${this.id}+select-shop`,
            'Select a shop',
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
            120_000
        )

        const submitShopButton = new ExtendedButtonComponent(`${this.id}+submit-shop`,
            new ButtonBuilder()
                .setLabel('Submit Shop')
                .setEmoji({name: '✅'})
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            (interaction: ButtonInteraction) => {
                if (this.selectedShop!.products.size == 0) return updateAsErrorMessage(interaction, 'The selected shop has no products')

                this.changeStage(RemoveProductFlowStage.SELECT_PRODUCT)
                this.updateInteraction(interaction)
            },
            120_000
        )

        this.componentsByStage.set(RemoveProductFlowStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>(
            `${this.id}+select-product`,
            'Select a product',
            new Map(),
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            },    
            120_000
        )

        const submitRemoveButton = new ExtendedButtonComponent(`${this.id}+remove-product`,
            new ButtonBuilder()
                .setLabel('Remove Product')
                .setEmoji({name: '⛔'})
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
            (interaction: ButtonInteraction) => this.success(interaction),
            120_000
        )

        const changeShopButton = new ExtendedButtonComponent(`${this.id}+change-shop`,
            new ButtonBuilder()
                .setLabel('Change Shop')
                .setEmoji({name: '📝'})
                .setStyle(ButtonStyle.Secondary),
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedProduct = null

                this.changeStage(RemoveProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            },
            120_000
        )

        this.componentsByStage.set(RemoveProductFlowStage.SELECT_PRODUCT, new Map())
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(productSelectMenu.customId, productSelectMenu)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(submitRemoveButton.customId, submitRemoveButton)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(changeShopButton.customId, changeShopButton)
    }

    protected updateComponents(): void {
        if (this.stage == RemoveProductFlowStage.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == RemoveProductFlowStage.SELECT_PRODUCT) {
            const submitRemoveButton = this.components.get(`${this.id}+remove-product`)
            if (submitRemoveButton instanceof ExtendedButtonComponent) {
                submitRemoveButton.toggle(this.selectedProduct != null)
            }

            const selectProductMenu = this.components.get(`${this.id}+select-product`)
            if (selectProductMenu instanceof ExtendedStringSelectMenuComponent) {
                selectProductMenu.updateMap(this.selectedShop?.products || new Map())
            }
        }
    }

    private changeStage(newStage: RemoveProductFlowStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected async success(interaction: UserFlowInteraction) {
        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, 'No selected shop')
            if (!this.selectedProduct) return updateAsErrorMessage(interaction, 'No selected product')

            await removeProduct(this.selectedShop.id, this.selectedProduct.id)

            await updateAsSuccessMessage(interaction, `You succesfully removed the product **${this.selectedProduct.name}** from the shop **${this.selectedShop.name}**`)

        } catch (error) {
            await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
            return
        }
    }
}