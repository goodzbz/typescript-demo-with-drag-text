interface Validatable {
  value: string | number
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
}
function validate(validatableInput: Validatable) {
  let isValid = true
  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0
  }
  if (validatableInput.minLength != null && typeof validatableInput.value === 'string') {
    isValid = isValid && validatableInput.value.length >= validatableInput.minLength
  }
  if (validatableInput.maxLength != null && typeof validatableInput.value === 'string') {
    isValid = isValid && validatableInput.value.length <= validatableInput.maxLength
  }
  if (validatableInput.min != null && typeof validatableInput.value === 'number') {
    isValid = isValid && validatableInput.value >= validatableInput.min
  }
  if (validatableInput.max != null && typeof validatableInput.value === 'number') {
    isValid = isValid && validatableInput.value <= validatableInput.max
  }
  return isValid
}
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const orginMethod = descriptor.value
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const bindFn = orginMethod.bind(this)
      return bindFn
    },
  }
  return adjDescriptor
}

interface Drggable {
  dragStartHandler(event: DragEvent): void
  dragEndHandler(event: DragEvent): void
}
interface DragTarget {
  dragOverHandler(event: DragEvent): void
  dropHandler(event: DragEvent): void
  dragLeaveHandler(event: DragEvent): void
}

enum ProjectStatus {
  Active,
  Finished,
}

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}

// type Listener = (items: Project[]) => void
type Listener<T> = (items: T[]) => void

class State<T> {
  protected listeners: Listener<T>[] = []
  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn)
  }
}

//两个数组 ---》判断状态---》放入
//两个数组---》 创建 ---》判断状态

class ProjectState extends State<Project> {
  private projects: Project[] = []
  private static instance: ProjectState
  private constructor() {
    super()
  }
  static getInstance() {
    if (this.instance) {
      return this.instance
    }
    this.instance = new ProjectState()
    return this.instance
  }
  addProject(title: string, description: string, numOfPeople: number) {
    const newProject = new Project(Math.random().toString(), title, description, numOfPeople, ProjectStatus.Active)
    this.projects.push(newProject)
    this.updateListeners()
  }
  moveProject(projectId: string, newStatus: ProjectStatus) {
    const project = this.projects.find((prj) => prj.id === projectId)
    if (project && project.status !== newStatus) {
      project.status = newStatus
      this.updateListeners()
    }
  }
  private updateListeners() {
    for (const listenerFn of this.listeners) {
      listenerFn(this.projects.slice())
    }
  }
}

const projectState = ProjectState.getInstance()

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement
  hostElement: T
  element: U
  constructor(templateId: string, hostElementId: string, insertAtStart: boolean, newElementId?: string) {
    this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement
    this.hostElement = document.getElementById(hostElementId)! as T
    const importedNode = document.importNode(this.templateElement.content, true)
    this.element = importedNode.firstElementChild as U
    //   this.element.id = newElementId
    if (newElementId) {
      this.element.id = newElementId
    }
    this.attach(insertAtStart)
  }
  private attach(insertAtBeginning: boolean) {
    this.hostElement.insertAdjacentElement(insertAtBeginning ? 'afterbegin' : 'beforeend', this.element)
  }
  abstract configure(): void
  abstract renderContent(): void
}

class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Drggable {
  private project: Project
  get persons() {
    if (this.project.people === 1) {
      return '1 person'
    } else {
      return `${this.project.people} persons`
    }
  }

  constructor(hostId: string, project: Project) {
    super('single-project', hostId, false, project.id)
    this.project = project

    this.configure()
    this.renderContent()
  }
  @autobind
  dragEndHandler(_: DragEvent): void {
    console.log('end')
  }
  @autobind
  dragStartHandler(event: DragEvent): void {
    event.dataTransfer!.setData('text/plain', this.project.id)
    event.dataTransfer!.effectAllowed = 'move'
  }
  configure() {
    this.element.addEventListener('dragstart', this.dragStartHandler)
    this.element.addEventListener('dragend', this.dragEndHandler)
  }

  renderContent() {
    this.element.querySelector('h2')!.textContent = this.project.title
    this.element.querySelector('h3')!.textContent = this.persons + ' assigned'
    this.element.querySelector('p')!.textContent = this.project.description
  }
}

// ProjectList Class
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget {
  assignedProjects: any[]
  constructor(private type: 'active' | 'finished') {
    super('project-list', 'app', false, `${type}-projects`)
    this.assignedProjects = []
    this.configure()
    this.renderContent()
  }
  configure() {
    this.element.addEventListener('dragover', this.dragOverHandler)
    this.element.addEventListener('dragleave', this.dragLeaveHandler)
    this.element.addEventListener('drop', this.dropHandler)
    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((prj) => {
        if (this.type === 'active') {
          return prj.status === ProjectStatus.Active
        }
        return prj.status === ProjectStatus.Finished
      })
      this.assignedProjects = relevantProjects
      this.renderProjects()
    })
  }
  private renderProjects() {
    const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement
    listEl.innerHTML = ''
    for (const prjItem of this.assignedProjects) {
      new ProjectItem(this.element.querySelector('ul')!.id, prjItem)
    }
  }
  renderContent() {
    const listId = `${this.type}-projects-list`
    this.element.querySelector('ul')!.id = listId
    this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + ' PROJECTS'
  }

  @autobind
  dropHandler(event: DragEvent): void {
    console.log(1)
    const prjId = event.dataTransfer!.getData('text/plain')
    projectState.moveProject(prjId, this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished)
  }

  @autobind
  dragOverHandler(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
      event.preventDefault()
      const listEl = this.element.querySelector('ul')!
      listEl.classList.add('droppable')
    }
  }

  @autobind
  dragLeaveHandler(_: DragEvent): void {
    const listEl = this.element.querySelector('ul')!
    listEl.classList.remove('droppable')
  }
}

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement
  descriptionInputElement: HTMLInputElement
  peopleInputElement: HTMLInputElement
  constructor() {
    super('project-input', 'app', true, 'user-input')
    this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement
    this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement
    this.peopleInputElement = this.element.querySelector('#people') as HTMLInputElement
    this.configure()
  }
  private gatherUserInput(): [string, string, number] | void {
    const enteredTitle = this.titleInputElement.value
    const enteredDescription = this.descriptionInputElement.value
    const enteredPeople = this.peopleInputElement.value
    const titleValidatable: Validatable = {
      value: enteredTitle,
      required: true,
    }
    const descriptionValidatable: Validatable = {
      value: enteredDescription,
      required: true,
      minLength: 5,
    }
    const peopleValidatable: Validatable = {
      value: +enteredPeople,
      required: true,
      min: 1,
      max: 5,
    }
    if (!validate(titleValidatable) || !validate(descriptionValidatable) || !validate(peopleValidatable)) {
      alert('Invalid input, please try again!')
      return
    } else {
      return [enteredTitle, enteredDescription, +enteredPeople]
    }
  }
  private clearInputs() {
    this.titleInputElement.value = ''
    this.descriptionInputElement.value = ''
    this.peopleInputElement.value = ''
  }
  @autobind
  private submitHandler(event: Event) {
    event.preventDefault()
    const userInput = this.gatherUserInput()
    if (Array.isArray(userInput)) {
      const [title, desc, people] = userInput
      projectState.addProject(title, desc, people)
      this.clearInputs()
    }
  }
  renderContent() {}
  configure() {
    this.element.addEventListener('submit', this.submitHandler)
  }
}

const prjInput = new ProjectInput()

const projectList = document.querySelector('#project-list')!
const activePrjList = new ProjectList('active')
const finishedPrjList = new ProjectList('finished')
