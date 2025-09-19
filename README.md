# SlideFlow Lite

SlideFlow Lite est un outil de présentation léger et élégant qui vous permet de créer des diaporamas directement à partir de fichiers Markdown. Il est conçu pour être simple, rapide et entièrement personnalisable via une interface intuitive.

Toutes vos modifications (contenu, thème, etc.) sont sauvegardées dans des fichiers locaux (`presentation.md`, `theme.json`), vous gardez donc un contrôle total sur votre projet.

## Lancement

SlideFlow Lite est une application web statique. Pour la faire fonctionner, vous avez simplement besoin de servir les fichiers via un serveur HTTP local. La méthode la plus simple est d'utiliser le serveur intégré de Python.

**Prérequis :** Assurez-vous que Python est installé sur votre machine.

Ouvrez un terminal (ou une invite de commande) à la racine du projet et suivez les instructions pour votre système d'exploitation.

### macOS

1.  Ouvrez l'application `Terminal.app`.
2.  Naviguez jusqu'au dossier du projet. Exemple : `cd /Users/nikos/Desktop/Slideflow-1.2-main`
3.  Lancez le serveur :
    ```bash
    python3 -m http.server
    ```
4.  Ouvrez votre navigateur web et allez à l'adresse : `http://localhost:8000`

### Linux

1.  Ouvrez votre terminal.
2.  Naviguez jusqu'au dossier du projet : `cd /chemin/vers/le/projet`
3.  Lancez le serveur :
    ```bash
    python3 -m http.server
    ```
4.  Ouvrez votre navigateur web et allez à l'adresse : `http://localhost:8000`

### Windows

1.  Assurez-vous d'avoir [installé Python](https://www.python.org/downloads/windows/) et que l'option "Add Python to PATH" était cochée lors de l'installation.
2.  Ouvrez l'invite de commande (`cmd`) ou `PowerShell`.
3.  Naviguez jusqu'au dossier du projet. Exemple : `cd C:\Users\VotreNom\Desktop\Slideflow-1.2-main`
4.  Lancez le serveur :
    ```bash
    python -m http.server
    ```
5.  Ouvrez votre navigateur web et allez à l'adresse : `http://localhost:8000`

## Comment utiliser l'application

### Structure de la présentation

Le contenu de votre présentation se trouve dans le fichier `presentation/presentation.md`.

-   **Diapositives** : Chaque diapositive est séparée par `===` sur une nouvelle ligne.
-   **Contenu** : Vous pouvez utiliser la syntaxe Markdown standard pour formater votre texte (titres, listes, gras, italique, etc.).
    -   `# Mon Titre` : Titre de la diapositive.
    -   `## Mon sous-titre` : Sous-titre de la diapositive.
-   **Images de fond** : Pour ajouter une image de fond à une diapositive, utilisez le "frontmatter" YAML en début de diapositive :
    ```yaml
    ---
    image: nom_de_votre_image.png
    ---
    ```
-   **Images dans le contenu** : Pour insérer une image directement dans votre texte, la syntaxe a été simplifiée. Utilisez simplement des crochets :
    ```markdown
    Ceci est un texte avec une image : [mon_image.jpg]
    ```
-   **Dossier des images** : Toutes vos images (de fond ou de contenu) doivent être placées dans le dossier `presentation/img/`.

### Interface Utilisateur (HUD)

L'interface principale vous permet de contrôler la présentation et la personnalisation.

-   **◀︎ / ▶︎** : Naviguer entre les diapositives.
-   **Indicateur de position** : Affiche la diapositive actuelle et le nombre total de diapositives.
-   **Sauvegarder la présentation** : Télécharge le contenu actuel de votre présentation dans un nouveau fichier `presentation.md`. Pensez à remplacer l'ancien par celui-ci pour conserver vos modifications.
-   **Charger un thème** : Vous permet de charger un fichier `theme.json` pour appliquer un style sauvegardé.
-   **Sauvegarder le thème** : Télécharge les réglages de style actuels dans un fichier `theme.json`.
-   **Télécharger la présentation** : Exporte votre diaporama complet en un seul fichier HTML interactif. Toutes les images sont incluses dans ce fichier, le rendant parfaitement autonome et facile à partager.
-   **🎨 Textes** : Ouvre le panneau de personnalisation des polices et des couleurs.
-   **✨ Effets** : Ouvre le panneau de personnalisation des effets visuels.

### Panneaux de personnalisation

#### Textes & Couleurs

-   **Couleurs** : Modifiez les couleurs du fond, des titres, du texte, de l'accentuation (liens, etc.) et du texte en gras.
-   **Espacement** : Ajustez l'interligne et la gouttière (l'espace vertical entre les paragraphes).
-   **Typographie** :
    -   Choisissez des polices depuis Google Fonts pour les titres et le corps du texte.
    -   Ajustez la taille des titres, sous-titres et du corps du texte.

#### Effets Visuels

-   **Animation & Effets** :
    -   **Vitesse** : Durée de l'animation de transition entre les diapositives.
    -   **Vignette** : Force de l'effet d'assombrissement sur les bords de l'écran.
    -   **Opacité Fold** : Opacité de l'image de pliure qui apparaît entre une diapositive avec image et une diapositive avec contenu.
-   **Apparence (Logo)** : Personnalisez l'affichage de votre logo (placé dans `presentation/img/logo.png`).
    -   Taille, opacité, arrondi des bords.
    -   Position dans l'un des quatre coins.
    -   Marge par rapport aux bords.
    -   Activation d'une ombre portée.

### Contrôles de diapositive

Pour chaque diapositive, vous pouvez ajuster dynamiquement :
-   **Zoom** : Zoome sur le contenu textuel de la diapositive.
-   **Marge Vert. / Horiz.** : Ajoute des marges verticales ou horizontales au contenu textuel.

Ces réglages sont sauvegardés avec la présentation.

### Raccourcis clavier

-   **Flèches Gauche / Droite** ou **Page Précédente / Suivante** : Naviguer.
-   **Espace** : Diapositive suivante.
-   **F** : Activer/désactiver le mode plein écran.
-   **I** : Masquer/afficher l'interface utilisateur (HUD).
-   **B** : Afficher un écran noir.
-   **W** : Afficher un écran blanc.
-   **Échap** : Quitter le mode écran noir/blanc.
