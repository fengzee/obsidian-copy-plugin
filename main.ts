import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { moment } from 'obsidian';

// Remember to rename these classes and interfaces!

interface DailyNotePluginSettings {
	enabled: boolean;
	dailyNotesFolder: string;
}

const DEFAULT_SETTINGS: DailyNotePluginSettings = {
	enabled: true,
	dailyNotesFolder: '每日笔记'
}

export default class DailyNotePlugin extends Plugin {
	settings: DailyNotePluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DailyNoteSettingTab(this.app, this));

		// 注册加载事件
		this.app.workspace.onLayoutReady(() => this.onWorkspaceReady());
	}

	onunload() {

	}

	async onWorkspaceReady() {
		if (!this.settings.enabled) return;

		const folder = this.app.vault.getAbstractFileByPath(this.settings.dailyNotesFolder);
		if (!folder) return;

		const today = moment().format('YYYY-MM-DD');
		const todayPath = `${this.settings.dailyNotesFolder}/${today}.md`;

		// 检查今日笔记是否存在
		const todayNote = this.app.vault.getAbstractFileByPath(todayPath);
		if (todayNote) return;

		// 查找最近的一篇日记
		const files = await this.app.vault.getAllLoadedFiles();
		const dailyNotes = files
			.filter(file => 
				file instanceof TFile &&
				file.path.startsWith(this.settings.dailyNotesFolder + '/') &&
				file.path.endsWith('.md') &&
				file.path < todayPath
			)
			.sort((a, b) => b.path.localeCompare(a.path));

		if (dailyNotes.length > 0) {
			const lastNote = dailyNotes[0] as TFile;
			const content = await this.app.vault.read(lastNote);
			await this.app.vault.create(todayPath, content);
		} else {
			// 如果没有之前的笔记，创建空笔记
			await this.app.vault.create(todayPath, '');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class DailyNoteSettingTab extends PluginSettingTab {
	plugin: DailyNotePlugin;

	constructor(app: App, plugin: DailyNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('启用自动创建每日笔记')
			.setDesc('工作区加载时，自动创建当天的笔记')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabled)
				.onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('每日笔记目录')
			.setDesc('存放每日笔记的目录名称')
			.addText(text => text
				.setPlaceholder('每日笔记')
				.setValue(this.plugin.settings.dailyNotesFolder)
				.onChange(async (value) => {
					this.plugin.settings.dailyNotesFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
