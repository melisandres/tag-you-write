{{ include('header.php', {title: 'Ajouter un Produit'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}


<form action="{{path}}/produit/store" method="post">
        <label> produit nom
            <input type="text" name="nom" value={{data.nom}}>
        </label>
        <label>description
            <input type="text" name="description" value={{data.description}}>
        </label>
        <label>prix
            <input type="number" name="prix" value={{data.prix}}>
        </label>

        <input type="submit" value="Save">
    </form>
</body>
</html>